const { prisma } = require('../config/database');

class MessageService {
  static async createMessage(messageData) {
    const { content, senderId, taskId } = messageData;

    // Verify user has access to this task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { clientId: senderId },
          { bids: { some: { freelancerId: senderId } } }
        ]
      }
    });

    if (!task) {
      throw new Error('Unauthorized to send message to this task');
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        taskId
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    return message;
  }

  static async getTaskMessages(taskId, userId) {
    // Verify user has access to this task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { clientId: userId },
          { bids: { some: { freelancerId: userId } } }
        ]
      }
    });

    if (!task) {
      throw new Error('Unauthorized to view messages for this task');
    }

    const messages = await prisma.message.findMany({
      where: { taskId },
      include: {
        sender: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return messages;
  }

  static async markAsRead(messageId, userId) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        task: {
          include: {
            bids: true
          }
        }
      }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Verify user has access to this message
    const hasAccess = message.task.clientId === userId || 
                     message.task.bids.some(bid => bid.freelancerId === userId);

    if (!hasAccess) {
      throw new Error('Unauthorized to mark this message as read');
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() }
    });

    return updatedMessage;
  }
}

module.exports = MessageService;