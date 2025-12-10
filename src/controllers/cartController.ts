import { Response } from 'express';
import { AuthRequest } from '../interfaces/Request';
import Cart, { ICartItem } from '../models/Cart';
import Furniture from '../models/Furniture';
import Rental, { OrderStatus, PaymentMethod, RentalStatus } from '../models/Rental';
import User from '../models/User';
import logger from '../utils/logger';
import mongoose from 'mongoose';
import { sendRentalConfirmation } from '../utils/email';
import { sendEmailInBackground } from '../utils/emailDispatcher';

// Get user's cart
export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    let cart = await Cart.findOne({ userId: req.userId }).populate('userId', 'fullName email');

    // If cart doesn't exist, create an empty one
    if (!cart) {
      cart = new Cart({
        userId: req.userId,
        items: [],
        total_monthly_amount: 0,
        total_deposit: 0,
        total_amount: 0
      });
      await cart.save();
    }

    // Validate items (check if products still exist and are available)
    const validatedItems: ICartItem[] = [];
    for (const item of cart.items) {
      try {
        const product = await Furniture.findById(item.product_id);
        if (!product) {
          logger.warn('Product not found in cart', { product_id: item.product_id });
          continue; // Skip invalid items
        }

        // Check if product is available for rent
        if (product.availability !== 'Available' || product.status !== 'Available') {
          logger.warn('Product not available', { 
            product_id: item.product_id, 
            availability: product.availability,
            status: product.status 
          });
          continue; // Skip unavailable items
        }

        // Check if product supports rental
        if (!product.listing_type || 
            (product.listing_type !== 'Rent' && product.listing_type !== 'Rent & Sell')) {
          logger.warn('Product not available for rent', { 
            product_id: item.product_id, 
            listing_type: product.listing_type 
          });
          continue; // Skip non-rental items
        }

        // Update item with current product data
        validatedItems.push({
          ...item,
          product_name: product.name,
          product_type: product.category as any,
          category: product.category,
          monthly_price: product.price?.rent_monthly || item.monthly_price,
          deposit: product.price?.deposit || item.deposit,
          photos: product.photos || [],
          item_type: product.item_type,
          brand: product.brand,
          condition: product.condition
        });
      } catch (error) {
        logger.error('Error validating cart item', { product_id: item.product_id, error });
        continue; // Skip invalid items
      }
    }

    // Update cart with validated items
    if (validatedItems.length !== cart.items.length) {
      cart.items = validatedItems;
      await cart.save();
    }

    return res.status(200).json(cart);
  } catch (error: any) {
    logger.error('Get cart error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error fetching cart',
      error: error.message
    });
  }
};

// Add item to cart
export const addToCart = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ message: 'product_id is required' });
    }

    // Validate product exists and is available
    const product = await Furniture.findById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if product is available for rent - provide detailed error messages
    if (product.availability !== 'Available') {
      return res.status(400).json({ 
        message: `Product is not available for rent. Current availability: ${product.availability}`,
        availability: product.availability,
        status: product.status,
        product_id: product._id,
        product_name: product.name,
        suggestion: 'Product may be rented or sold. Please check product details.'
      });
    }

    if (product.status !== 'Available') {
      return res.status(400).json({ 
        message: `Product status is not available. Current status: ${product.status}`,
        availability: product.availability,
        status: product.status,
        product_id: product._id,
        product_name: product.name,
        suggestion: 'Product may be rented or sold. Please check product details.'
      });
    }

    // Check if product supports rental
    if (!product.listing_type) {
      return res.status(400).json({ 
        message: 'Product does not have a listing type configured',
        listing_type: product.listing_type,
        product_id: product._id,
        product_name: product.name,
        suggestion: 'Please contact admin to configure listing type.'
      });
    }

    if (product.listing_type !== 'Rent' && product.listing_type !== 'Rent & Sell') {
      return res.status(400).json({ 
        message: `Product is not available for rental. Listing type: ${product.listing_type}`,
        listing_type: product.listing_type,
        product_id: product._id,
        product_name: product.name,
        suggestion: `This product is only available for ${product.listing_type === 'Sell' ? 'purchase' : 'other transactions'}.`
      });
    }

    // Check stock
    if (product.stock !== undefined && product.stock < quantity) {
      return res.status(400).json({
        message: `Not enough stock available. Requested: ${quantity}, Available: ${product.stock}`,
        available_stock: product.stock,
        requested_quantity: quantity,
        product_id: product._id,
        product_name: product.name,
        suggestion: `Please reduce quantity to ${product.stock} or less.`
      });
    }

    // Check if product has rental price
    if (!product.price?.rent_monthly) {
      return res.status(400).json({ 
        message: 'Product does not have a rental price configured',
        product_id: product._id,
        product_name: product.name,
        has_price: !!product.price,
        has_rent_monthly: !!product.price?.rent_monthly,
        suggestion: 'Please contact admin to configure rental price.'
      });
    }

    // Get or create cart
    let cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      cart = new Cart({
        userId: req.userId,
        items: [],
        total_monthly_amount: 0,
        total_deposit: 0,
        total_amount: 0
      });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product_id === product_id.toString()
    );

    if (existingItemIndex >= 0) {
      // Update quantity
      const newQty = cart.items[existingItemIndex].quantity + quantity;
      if (product.stock !== undefined && newQty > product.stock) {
        return res.status(400).json({
          message: 'Not enough stock available for requested quantity',
          available_stock: product.stock
        });
      }
      cart.items[existingItemIndex].quantity = newQty;
    } else {
      // Add new item
      const newItem: ICartItem = {
        product_id: product._id.toString(),
        product_name: product.name,
        product_type: product.category as any,
        category: product.category,
        quantity: quantity,
        monthly_price: product.price.rent_monthly,
        deposit: product.price.deposit || 0,
        photos: product.photos || [],
        item_type: product.item_type,
        brand: product.brand,
        condition: product.condition,
        subtotal_monthly: product.price.rent_monthly * quantity,
        subtotal_deposit: (product.price.deposit || 0) * quantity
      };
      cart.items.push(newItem);
    }

    await cart.save();

    logger.info('Item added to cart', {
      userId: req.userId,
      product_id,
      quantity,
      cartItemsCount: cart.items.length
    });

    return res.status(200).json({
      message: 'Item added to cart successfully',
      cart
    });
  } catch (error: any) {
    logger.error('Add to cart error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error adding item to cart',
      error: error.message
    });
  }
};

// Update cart item quantity
export const updateCartItem = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { product_id, quantity } = req.body;

    if (!product_id || quantity === undefined) {
      return res.status(400).json({ 
        message: 'product_id and quantity are required' 
      });
    }

    if (quantity < 1) {
      return res.status(400).json({ 
        message: 'Quantity must be at least 1. Use remove endpoint to remove items.' 
      });
    }

    const cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(
      item => item.product_id === product_id.toString()
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    // Validate product still exists and is available
    const product = await Furniture.findById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.availability !== 'Available' || product.status !== 'Available') {
      return res.status(400).json({ 
        message: 'Product is no longer available',
        availability: product.availability,
        status: product.status
      });
    }

    // Check stock
    if (product.stock !== undefined && quantity > product.stock) {
      return res.status(400).json({
        message: 'Not enough stock available',
        available_stock: product.stock
      });
    }

    // Update quantity and recalculate
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].monthly_price = product.price?.rent_monthly || cart.items[itemIndex].monthly_price;
    cart.items[itemIndex].deposit = product.price?.deposit || cart.items[itemIndex].deposit;

    await cart.save();

    logger.info('Cart item updated', {
      userId: req.userId,
      product_id,
      quantity
    });

    return res.status(200).json({
      message: 'Cart item updated successfully',
      cart
    });
  } catch (error: any) {
    logger.error('Update cart item error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error updating cart item',
      error: error.message
    });
  }
};

// Remove item from cart
export const removeFromCart = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { product_id } = req.params;

    if (!product_id) {
      return res.status(400).json({ message: 'product_id is required' });
    }

    const cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(
      item => item.product_id === product_id.toString()
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    logger.info('Item removed from cart', {
      userId: req.userId,
      product_id
    });

    return res.status(200).json({
      message: 'Item removed from cart successfully',
      cart
    });
  } catch (error: any) {
    logger.error('Remove from cart error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error removing item from cart',
      error: error.message
    });
  }
};

// Clear cart (remove all items)
export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = [];
    await cart.save();

    logger.info('Cart cleared', { userId: req.userId });

    return res.status(200).json({
      message: 'Cart cleared successfully',
      cart
    });
  } catch (error: any) {
    logger.error('Clear cart error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error clearing cart',
      error: error.message
    });
  }
};

// Update delivery charge
export const updateDeliveryCharge = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { delivery_charge } = req.body;

    if (delivery_charge === undefined || delivery_charge < 0) {
      return res.status(400).json({ 
        message: 'delivery_charge must be a non-negative number' 
      });
    }

    const cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.delivery_charge = delivery_charge;
    await cart.save();

    logger.info('Delivery charge updated', {
      userId: req.userId,
      delivery_charge
    });

    return res.status(200).json({
      message: 'Delivery charge updated successfully',
      cart
    });
  } catch (error: any) {
    logger.error('Update delivery charge error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error updating delivery charge',
      error: error.message
    });
  }
};

// Checkout: Convert cart to rental order
export const checkout = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const {
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      start_date,
      end_date,
      payment_method = PaymentMethod.COD,
      notes,
      delivery_date
    } = req.body;

    // Validate required fields
    if (!customer_name || !customer_email || !customer_phone) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['customer_name', 'customer_email', 'customer_phone']
      });
    }

    // Get user's cart
    const cart = await Cart.findOne({ userId: req.userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ 
        message: 'Cart is empty. Add items to cart before checkout.' 
      });
    }

    // Validate all items are still available
    const validatedItems: any[] = [];
    const unavailableItems: string[] = [];

    for (const cartItem of cart.items) {
      try {
        const product = await Furniture.findById(cartItem.product_id);
        if (!product) {
          unavailableItems.push(cartItem.product_name);
          continue;
        }

        if (product.availability !== 'Available' || product.status !== 'Available') {
          unavailableItems.push(cartItem.product_name);
          continue;
        }

        if (!product.listing_type || 
            (product.listing_type !== 'Rent' && product.listing_type !== 'Rent & Sell')) {
          unavailableItems.push(cartItem.product_name);
          continue;
        }

        // Check stock
        if (product.stock !== undefined && product.stock < cartItem.quantity) {
          unavailableItems.push(`${cartItem.product_name} (stock: ${product.stock || 0})`);
          continue;
        }

        // Use current product pricing
        validatedItems.push({
          product_id: product._id.toString(),
          product_name: product.name,
          product_type: product.category,
          quantity: cartItem.quantity,
          monthly_price: product.price?.rent_monthly || cartItem.monthly_price,
          deposit: product.price?.deposit || cartItem.deposit,
          start_date: start_date ? new Date(start_date) : new Date(),
          end_date: end_date ? new Date(end_date) : undefined
        });
      } catch (error) {
        logger.error('Error validating cart item during checkout', {
          product_id: cartItem.product_id,
          error
        });
        unavailableItems.push(cartItem.product_name);
      }
    }

    if (unavailableItems.length > 0) {
      return res.status(400).json({
        message: 'Some items are no longer available',
        unavailable_items: unavailableItems,
        suggestion: 'Please remove unavailable items from cart and try again.'
      });
    }

    if (validatedItems.length === 0) {
      return res.status(400).json({
        message: 'No valid items in cart'
      });
    }

    // Get user details
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate totals
    const total_monthly_amount = validatedItems.reduce(
      (sum, item) => sum + (item.monthly_price * item.quantity),
      0
    );
    const total_deposit = validatedItems.reduce(
      (sum, item) => sum + (item.deposit * item.quantity),
      0
    );

    // Generate rental_id
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const crypto = require('crypto');
    const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
    const rental_id = `RENT-${year}-${month}${day}-${randomString}`;

    // Create rental order
    const rentalData: any = {
      rental_id,
      customer_name: customer_name || user.fullName,
      customer_email: customer_email || user.email,
      customer_phone: customer_phone || user.phoneNumber,
      items: validatedItems,
      total_monthly_amount,
      total_deposit,
      delivery_charge: cart.delivery_charge || 0,
      start_date: start_date ? new Date(start_date) : new Date(),
      end_date: end_date ? new Date(end_date) : undefined,
      status: RentalStatus.ACTIVE,
      order_status: OrderStatus.PENDING, // Order placed, awaiting processing
      payment_method: payment_method || PaymentMethod.COD,
      payment_records: [],
      notes,
      userId: req.userId,
      createdBy: req.userId,
      updatedBy: req.userId,
      order_placed_at: new Date(),
      delivery_date: delivery_date ? new Date(delivery_date) : undefined
    };

    if (customer_address) {
      rentalData.customer_address = customer_address;
    }

    // Use native MongoDB to create rental (bypass Mongoose validation issues)
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not ready');
    }

    const rentalsCollection = db.collection('rentals');
    const result = await rentalsCollection.insertOne(rentalData);

    if (!result.insertedId) {
      throw new Error('Failed to create rental order');
    }

    // Fetch the created rental
    const rental = await Rental.findById(result.insertedId);

    if (!rental) {
      throw new Error('Rental created but could not be retrieved');
    }

    // Update furniture availability status and stock
    for (const item of validatedItems) {
      try {
        const product = await Furniture.findById(item.product_id);
        if (product) {
          const newStock = (product.stock || 0) - item.quantity;
          const update: any = {
            stock: Math.max(newStock, 0)
          };

          // If stock goes to zero, mark as not available
          if (newStock <= 0) {
            update.availability = 'Rented';
            update.status = 'Rented';
          }

          await Furniture.findByIdAndUpdate(
            item.product_id,
            { $set: update }
          );
        }
      } catch (error) {
        logger.error('Error updating furniture availability', {
          product_id: item.product_id,
          error
        });
        // Don't fail the checkout if furniture update fails
      }
    }

    // Clear cart after successful checkout
    cart.items = [];
    await cart.save();

    // Send confirmation email in background
    sendEmailInBackground(
      'Rental Confirmation',
      () => sendRentalConfirmation(rental)
    );

    logger.info('Checkout successful', {
      userId: req.userId,
      rental_id: rental.rental_id,
      items_count: validatedItems.length,
      total_amount: total_monthly_amount + total_deposit + (cart.delivery_charge || 0)
    });

    return res.status(201).json({
      message: 'Order placed successfully',
      rental,
      order_summary: {
        rental_id: rental.rental_id,
        order_status: rental.order_status,
        payment_method: rental.payment_method,
        total_monthly: total_monthly_amount,
        total_deposit,
        delivery_charge: cart.delivery_charge || 0,
        total_amount: total_monthly_amount + total_deposit + (cart.delivery_charge || 0),
        items_count: validatedItems.length
      }
    });
  } catch (error: any) {
    logger.error('Checkout error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error processing checkout',
      error: error.message
    });
  }
};

