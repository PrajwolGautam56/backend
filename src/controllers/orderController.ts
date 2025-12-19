import { Request, Response } from 'express';
import { AuthRequest } from '../interfaces/Request';
import Order, { OrderStatus } from '../models/Order';
import User from '../models/User';
import logger from '../utils/logger';
import mongoose from 'mongoose';

// Get all orders (Admin) with filtering
export const getOrders = async (req: Request, res: Response) => {
  try {
    const {
      order_status,
      customer_email,
      search,
      page = '1',
      limit = '10',
      sortBy = 'order_placed_at',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (order_status) {
      query.order_status = order_status;
    }

    if (customer_email) {
      query.customer_email = { $regex: customer_email, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { customer_name: { $regex: search, $options: 'i' } },
        { customer_email: { $regex: search, $options: 'i' } },
        { customer_phone: { $regex: search, $options: 'i' } },
        { order_id: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Order.countDocuments(query);

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const orders = await Order.find(query)
      .populate('userId', 'fullName email username')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// Get single order by ID
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if id is a valid MongoDB ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    let order = null;

    if (isValidObjectId) {
      // Try to find by MongoDB _id first
      order = await Order.findById(id)
        .populate('userId', 'fullName email username phoneNumber');
    }

    // If not found by _id, try to find by order_id
    if (!order) {
      order = await Order.findOne({ order_id: id })
        .populate('userId', 'fullName email username phoneNumber');
    }

    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
        orderId: id
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error: any) {
    logger.error('Error fetching order:', error);
    res.status(500).json({
      message: 'Error fetching order',
      error: error.message
    });
  }
};

// Update order status (Admin)
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { order_status, delivery_date, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid order ID format'
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
        orderId: id
      });
    }

    const updateData: any = {};
    if (order_status) {
      updateData.order_status = order_status;
      if (order_status === OrderStatus.CONFIRMED && !order.order_confirmed_at) {
        updateData.order_confirmed_at = new Date();
      }
      if (order_status === OrderStatus.DELIVERED && !order.delivered_at) {
        updateData.delivered_at = new Date();
      }
    }
    if (delivery_date) {
      updateData.delivery_date = new Date(delivery_date);
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    await Order.findByIdAndUpdate(id, { $set: updateData });
    const updatedOrder = await Order.findById(id);

    logger.info('Order status updated', { orderId: order.order_id, order_status });

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    });
  } catch (error: any) {
    logger.error('Error updating order status:', error);
    res.status(500).json({
      message: 'Error updating order status',
      error: error.message
    });
  }
};

// Confirm order (Admin)
export const confirmOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    order.order_status = OrderStatus.CONFIRMED;
    order.order_confirmed_at = new Date();
    await order.save();

    logger.info('Order confirmed', { orderId: order.order_id });

    res.status(200).json({
      success: true,
      message: 'Order confirmed successfully',
      data: order
    });
  } catch (error: any) {
    logger.error('Error confirming order:', error);
    res.status(500).json({
      message: 'Error confirming order',
      error: error.message
    });
  }
};

// Mark as out for delivery (Admin)
export const markOutForDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { delivery_date } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    order.order_status = OrderStatus.OUT_FOR_DELIVERY;
    if (delivery_date) {
      order.delivery_date = new Date(delivery_date);
    }
    await order.save();

    logger.info('Order marked as out for delivery', { orderId: order.order_id });

    res.status(200).json({
      success: true,
      message: 'Order marked as out for delivery',
      data: order
    });
  } catch (error: any) {
    logger.error('Error marking order as out for delivery:', error);
    res.status(500).json({
      message: 'Error marking order as out for delivery',
      error: error.message
    });
  }
};

// Mark as delivered (Admin)
export const markAsDelivered = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    order.order_status = OrderStatus.DELIVERED;
    order.delivered_at = new Date();
    await order.save();

    logger.info('Order marked as delivered', { orderId: order.order_id });

    res.status(200).json({
      success: true,
      message: 'Order marked as delivered',
      data: order
    });
  } catch (error: any) {
    logger.error('Error marking order as delivered:', error);
    res.status(500).json({
      message: 'Error marking order as delivered',
      error: error.message
    });
  }
};

// Delete order (Admin)
export const deleteOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid order ID format'
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
        orderId: id
      });
    }

    await Order.findByIdAndDelete(id);

    logger.info('Order deleted', { orderId: order.order_id });

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting order:', error);
    res.status(500).json({
      message: 'Error deleting order',
      error: error.message
    });
  }
};

// Get order status statistics (Admin)
export const getOrderStatusStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Get all orders (cart orders only - separate collection)
    const allOrders = await Order.find({});

    const stats: Record<string, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.PROCESSING]: 0,
      [OrderStatus.CONFIRMED]: 0,
      [OrderStatus.OUT_FOR_DELIVERY]: 0,
      [OrderStatus.DELIVERED]: 0,
      [OrderStatus.CANCELLED]: 0,
      [OrderStatus.REFUNDED]: 0
    };

    const ordersByStatus: Record<string, any[]> = {};
    Object.keys(stats).forEach(status => {
      ordersByStatus[status] = [];
    });

    allOrders.forEach(order => {
      const orderStatus = order.order_status || OrderStatus.PENDING;
      stats[orderStatus] = (stats[orderStatus] || 0) + 1;
      ordersByStatus[orderStatus].push({
        order_id: order.order_id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        total_amount: (order.total_monthly_amount || 0) + (order.total_deposit || 0) + (order.delivery_charge || 0),
        order_placed_at: order.order_placed_at || (order as any).createdAt,
        delivery_date: order.delivery_date,
        delivered_at: order.delivered_at
      });
    });

    res.status(200).json({
      success: true,
      data: {
        summary: stats,
        orders_by_status: ordersByStatus,
        total_orders: allOrders.length
      }
    });
  } catch (error: any) {
    logger.error('Error fetching order status stats:', error);
    res.status(500).json({
      message: 'Error fetching order status statistics',
      error: error.message
    });
  }
};

