const { prisma } = require('../config/database');
const { sendEmail } = require('../config/email');

class NotificationService {
  static async createNotification(userId, type, payload) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        payload
      }
    });

    // Send email notification based on type
    await this.sendEmailNotification(userId, type, payload);

    return notification;
  }

  static async getUserNotifications(userId, page = 1, limit = 20) {
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.notification.count({ where: { userId } })
    ]);

    return {
      notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async markAsRead(notificationId, userId) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() }
    });
  }

  static async markAllAsRead(userId) {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() }
    });
  }

  static async sendEmailNotification(userId, type, payload) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      });

      if (!user) return;

      let subject, html;

      switch (type) {
        case 'NEW_BID':
          subject = 'New Bid Received';
          html = `
            <h2>You have received a new bid!</h2>
            <p>Hi ${user.name},</p>
            <p><strong>${payload.bidderName}</strong> has submitted a bid of <strong>$${payload.bidAmount}</strong> for your task "${payload.taskTitle}".</p>
            <p>Visit SkillLink to review the bid.</p>
          `;
          break;
        case 'BID_ACCEPTED':
          subject = 'Your Bid Was Accepted!';
          html = `
            <h2>Congratulations! Your bid was accepted</h2>
            <p>Hi ${user.name},</p>
            <p>Your bid of <strong>$${payload.amount}</strong> for the task "${payload.taskTitle}" has been accepted.</p>
            <p>You can now start working on this project.</p>
          `;
          break;
        case 'PAYMENT_RECEIVED':
          subject = 'Payment Received';
          html = `
            <h2>Payment Received</h2>
            <p>Hi ${user.name},</p>
            <p>You have received a payment of <strong>$${payload.amount}</strong> for "${payload.milestoneDescription}".</p>
          `;
          break;
        default:
          return;
      }

      await sendEmail(user.email, subject, html);
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }
}

module.exports = NotificationService;