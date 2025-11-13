import Rental, { PaymentStatus, RentalStatus } from '../models/Rental';
import logger from './logger';
import {
  sendPaymentReminder,
  sendOverduePaymentReminder
} from './email';

/**
 * Automatically generate payment records for active rentals
 * This ensures payment records are created only for months that are due or past
 * Should be called daily to keep records up to date
 */
export const autoGeneratePaymentRecords = async () => {
  try {
    logger.info('Auto-generating payment records for active rentals...');

    const activeRentals = await Rental.find({ status: RentalStatus.ACTIVE });
    let recordsGenerated = 0;

    for (const rental of activeRentals) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const rentalStart = new Date(rental.start_date);
        rentalStart.setHours(0, 0, 0, 0);

        // Get the day of month from start date for consistent due dates
        const dayOfMonth = rentalStart.getDate();

        // First payment month is the same month as rental start
        const firstPaymentMonth = new Date(rentalStart);
        firstPaymentMonth.setDate(1);

        // Calculate current month + 1 month ahead
        const currentMonth = new Date(today);
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        const maxMonth = new Date(currentMonth);
        maxMonth.setMonth(maxMonth.getMonth() + 1);

        let paymentMonth = new Date(firstPaymentMonth);
        let monthIndex = 0; // Start from 0 (first month is start month)
        let newRecords = 0;

        while (paymentMonth <= maxMonth) {
          const year = paymentMonth.getFullYear();
          const month = (paymentMonth.getMonth() + 1).toString().padStart(2, '0');
          const monthKey = `${year}-${month}`;

          // Check if payment record already exists
          const existingRecord = rental.payment_records?.find(
            (r: any) => r.month === monthKey
          );

          if (!existingRecord) {
            // Due date is the same day of the payment month
            // For first month (monthIndex === 0): due date = start date
            // For subsequent months: due date = same day of that month
            let dueDate: Date;
            if (monthIndex === 0) {
              // First payment: due date is the rental start date
              dueDate = new Date(rentalStart);
            } else {
              // Subsequent payments: same day of the payment month
              dueDate = new Date(paymentMonth.getFullYear(), paymentMonth.getMonth(), dayOfMonth);
              
              // Handle edge case: if day doesn't exist in that month (e.g., Jan 31 -> Feb 31), use last day of month
              if (dueDate.getMonth() !== paymentMonth.getMonth()) {
                // Day doesn't exist in this month, use last day of the payment month
                dueDate = new Date(paymentMonth.getFullYear(), paymentMonth.getMonth() + 1, 0);
              }
            }

            // Determine status
            let status = PaymentStatus.PENDING;
            const dueDateCheck = new Date(dueDate);
            dueDateCheck.setHours(0, 0, 0, 0);
            
            if (dueDateCheck < today) {
              status = PaymentStatus.OVERDUE;
            }

            // Add payment record
            if (!rental.payment_records) {
              rental.payment_records = [];
            }
            rental.payment_records.push({
              month: monthKey,
              amount: rental.total_monthly_amount,
              dueDate,
              status
            } as any);

            newRecords++;
          }

          paymentMonth.setMonth(paymentMonth.getMonth() + 1);
          monthIndex++;
        }

        if (newRecords > 0) {
          await rental.save();
          recordsGenerated += newRecords;
          logger.info('Payment records auto-generated', {
            rentalId: rental.rental_id,
            recordsGenerated: newRecords
          });
        }
      } catch (rentalError: any) {
        logger.warn('Error auto-generating records for rental', {
          rentalId: rental.rental_id,
          error: rentalError.message
        });
      }
    }

    logger.info('Auto-generation of payment records completed', {
      totalRentals: activeRentals.length,
      totalRecordsGenerated: recordsGenerated
    });

    return { totalRentals: activeRentals.length, recordsGenerated };
  } catch (error: any) {
    logger.error('Error in auto-generating payment records:', error);
    throw error;
  }
};

/**
 * Check and send payment reminders for all active rentals
 * This function should be called by a cron job daily
 */
export const checkAndSendPaymentReminders = async () => {
  try {
    logger.info('Starting payment reminder check...');

    // Get all active rentals
    const activeRentals = await Rental.find({ status: RentalStatus.ACTIVE });

    let remindersSent = 0;
    let overdueRemindersSent = 0;

    for (const rental of activeRentals) {
      // Check each payment record
      for (const payment of rental.payment_records || []) {
        // Skip if already paid
        if (payment.status === PaymentStatus.PAID) {
          continue;
        }

        const dueDate = new Date(payment.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);

        const daysDifference = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Send reminder 3 days before due date
        if (daysDifference === 3) {
          try {
            await sendPaymentReminder(rental.toObject(), payment.toObject(), 3);
            remindersSent++;
            logger.info('Payment reminder sent (3 days)', {
              rentalId: rental.rental_id,
              month: payment.month,
              email: rental.customer_email
            });
          } catch (error) {
            logger.error('Error sending 3-day reminder', { error, rentalId: rental.rental_id });
          }
        }

        // Send reminder 1 day before due date
        if (daysDifference === 1) {
          try {
            await sendPaymentReminder(rental.toObject(), payment.toObject(), 1);
            remindersSent++;
            logger.info('Payment reminder sent (1 day)', {
              rentalId: rental.rental_id,
              month: payment.month,
              email: rental.customer_email
            });
          } catch (error) {
            logger.error('Error sending 1-day reminder', { error, rentalId: rental.rental_id });
          }
        }

        // Send reminder on due date
        if (daysDifference === 0) {
          try {
            await sendPaymentReminder(rental.toObject(), payment.toObject(), 0);
            remindersSent++;
            logger.info('Payment reminder sent (due today)', {
              rentalId: rental.rental_id,
              month: payment.month,
              email: rental.customer_email
            });
          } catch (error) {
            logger.error('Error sending due-today reminder', { error, rentalId: rental.rental_id });
          }
        }

        // Send overdue reminder if payment is past due date
        if (daysDifference < 0 && (payment.status as string) !== PaymentStatus.PAID) {
          const daysOverdue = Math.abs(daysDifference);
          
          // Update payment status to overdue if not already
          if (payment.status !== PaymentStatus.OVERDUE) {
            payment.status = PaymentStatus.OVERDUE;
            await rental.save();
          }

          // Send overdue reminder (daily for first 3 days, then weekly)
          const shouldSendOverdueReminder = 
            daysOverdue <= 3 || // Daily for first 3 days
            daysOverdue % 7 === 0; // Weekly after that

          if (shouldSendOverdueReminder) {
            try {
              await sendOverduePaymentReminder(rental.toObject(), payment.toObject(), daysOverdue);
              overdueRemindersSent++;
              logger.info('Overdue payment reminder sent', {
                rentalId: rental.rental_id,
                month: payment.month,
                daysOverdue,
                email: rental.customer_email
              });
            } catch (error) {
              logger.error('Error sending overdue reminder', { error, rentalId: rental.rental_id });
            }
          }
        }
      }
    }

    logger.info('Payment reminder check completed', {
      totalRentals: activeRentals.length,
      remindersSent,
      overdueRemindersSent
    });

    return {
      totalRentals: activeRentals.length,
      remindersSent,
      overdueRemindersSent
    };
  } catch (error) {
    logger.error('Error in payment reminder check:', error);
    throw error;
  }
};

/**
 * Manually trigger payment reminders for a specific rental
 * Useful for admin to send reminders on-demand
 */
export const sendRemindersForRental = async (rentalId: string) => {
  try {
    const rental = await Rental.findById(rentalId);
    if (!rental) {
      throw new Error('Rental not found');
    }

    if (rental.status !== RentalStatus.ACTIVE) {
      throw new Error('Rental is not active');
    }

    let remindersSent = 0;

    for (const payment of rental.payment_records || []) {
      if (payment.status === PaymentStatus.PAID) {
        continue;
      }

      const dueDate = new Date(payment.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);

      const daysDifference = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDifference >= 0) {
        // Payment is upcoming or due today
        await sendPaymentReminder(rental.toObject(), payment.toObject(), daysDifference);
        remindersSent++;
      } else {
        // Payment is overdue
        const daysOverdue = Math.abs(daysDifference);
        await sendOverduePaymentReminder(rental.toObject(), payment.toObject(), daysOverdue);
        remindersSent++;
      }
    }

    logger.info('Manual payment reminders sent', {
      rentalId: rental.rental_id,
      remindersSent
    });

    return { remindersSent };
  } catch (error) {
    logger.error('Error sending manual reminders:', error);
    throw error;
  }
};

