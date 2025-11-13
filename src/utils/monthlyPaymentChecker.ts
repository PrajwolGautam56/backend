import FurnitureTransaction from '../models/FurnitureTransaction';
import { TransactionType, PaymentStatus } from '../interfaces/FurnitureTransaction';
import logger from './logger';
import { sendPaymentReminder } from './email';

/**
 * Check for monthly rental payments that are due
 * This should be run daily to identify rentals that need monthly payment
 */
export const checkMonthlyRentalPayments = async () => {
  try {
    logger.info('Checking for monthly rental payments due...');

    // Find all active rental transactions
    const rentals = await FurnitureTransaction.find({
      transaction_type: TransactionType.RENT,
      status: 'Active',
      payment_status: { $in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] }
    })
      .populate('user_id', 'fullName email phoneNumber')
      .populate('furniture_id', 'name');

    const now = new Date();
    const paymentsDue: any[] = [];

    for (const rental of rentals) {
      const rentalStart = rental.rental_start_date || rental.createdAt;
      const monthlyRent = rental.monthly_rent || 0;

      if (monthlyRent <= 0) continue;

      // Calculate months since rental started
      const monthsSinceStart = Math.floor(
        (now.getTime() - rentalStart.getTime()) / (30 * 24 * 60 * 60 * 1000)
      );

      // Calculate how many months have been paid
      const totalPaid = rental.total_paid || 0;
      const deposit = rental.deposit_amount || 0;
      const rentPaid = Math.max(0, totalPaid - deposit);
      const monthsPaid = Math.floor(rentPaid / monthlyRent);

      // Check if payment is due (more than 30 days since last payment)
      const lastPaymentDate = rental.payment_records.length > 0
        ? new Date(Math.max(...rental.payment_records.map(p => new Date(p.payment_date).getTime())))
        : rentalStart;

      const daysSinceLastPayment = Math.floor(
        (now.getTime() - lastPaymentDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      // Update payment status to overdue if due date has passed
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let needsSave = false;
      for (const payment of rental.payment_records || []) {
        if ((payment.status as string) === 'Pending') {
          const dueDate = new Date((payment as any).dueDate);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate < today) {
            (payment as any).status = 'Overdue';
            needsSave = true;
          }
        }
      }
      
      if (needsSave) {
        await rental.save();
      }

      // Payment is due if:
      // 1. More than 30 days since last payment, OR
      // 2. Months since start > months paid
      const monthsDue = Math.max(0, monthsSinceStart - monthsPaid);
      const amountDue = monthsDue * monthlyRent;

      if (amountDue > 0 && daysSinceLastPayment >= 30) {
        const nextPaymentDue = new Date(
          rentalStart.getTime() + (monthsPaid + 1) * 30 * 24 * 60 * 60 * 1000
        );

        paymentsDue.push({
          transaction: rental,
          monthsDue,
          amountDue,
          nextPaymentDue,
          daysSinceLastPayment,
          customer: rental.user_id
        });

        // Send payment reminder email
        try {
          const customer = rental.user_id as any;
          if (customer?.email) {
            await sendPaymentReminder(
              {
                rental_id: rental.transaction_id,
                customer_name: customer.fullName,
                customer_email: customer.email,
                items: [{
                  product_name: (rental.furniture_id as any)?.name || 'Furniture Item',
                  monthly_price: monthlyRent
                }],
                start_date: rentalStart,
                total_monthly_amount: monthlyRent
              } as any,
              {
                month: nextPaymentDue.toLocaleString('default', { month: 'long' }),
                amount: amountDue,
                dueDate: nextPaymentDue,
                status: 'Pending' as any
              } as any,
              daysSinceLastPayment
            );

            logger.info('Monthly payment reminder sent', {
              transactionId: rental.transaction_id,
              email: customer.email,
              amountDue
            });
          }
        } catch (emailError: any) {
          logger.error('Error sending payment reminder', {
            error: emailError.message,
            transactionId: rental.transaction_id
          });
        }
      }
    }

    logger.info('Monthly payment check completed', {
      totalRentals: rentals.length,
      paymentsDue: paymentsDue.length
    });

    return paymentsDue;
  } catch (error: any) {
    logger.error('Error checking monthly rental payments', { error: error.message });
    throw error;
  }
};

