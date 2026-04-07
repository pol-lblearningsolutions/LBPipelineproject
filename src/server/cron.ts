import { prisma } from './db.js';

export function startCronJobs() {
  // Check for upcoming tasks every minute
  setInterval(async () => {
    try {
      const now = new Date();
      // Look for tasks due in the next 24 hours that haven't had a reminder sent
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const upcomingTasks = await prisma.task.findMany({
        where: {
          due_date: {
            gte: now,
            lte: twentyFourHoursFromNow,
          },
          status: {
            notIn: ['Complete', 'Cancelled']
          },
          reminder_sent: false,
          owner_user_id: {
            not: null
          }
        },
        include: {
          owner: true
        }
      });

      for (const task of upcomingTasks) {
        if (task.owner_user_id) {
          // Create a notification
          await prisma.notification.create({
            data: {
              user_id: task.owner_user_id,
              message: `Reminder: Task "${task.title}" is due soon (by ${task.due_date?.toLocaleDateString()}).`
            }
          });

          // Mark reminder as sent
          await prisma.task.update({
            where: { id: task.id },
            data: { reminder_sent: true }
          });
        }
      }
    } catch (error) {
      console.error('Error running task reminder cron job:', error);
    }
  }, 60 * 1000); // Run every minute
}
