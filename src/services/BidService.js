const { prisma } = require('../config/database');
const NotificationService = require('./NotificationService');

class BidService {
  static async createBid(freelancerId, taskId, bidData) {
    // Check if task exists and is open
    const task = await prisma.task.findFirst({
      where: { id: taskId, status: 'OPEN' },
      include: { client: true }
    });

    if (!task) {
      throw new Error('Task not found or not open for bidding');
    }

    // Check if user already has a bid on this task
    const existingBid = await prisma.bid.findFirst({
      where: { freelancerId, taskId }
    });

    if (existingBid) {
      throw new Error('You have already submitted a bid for this task');
    }

    // Create bid
    const bid = await prisma.bid.create({
      data: {
        ...bidData,
        freelancerId,
        taskId
      },
      include: {
        freelancer: {
          select: { id: true, name: true, bio: true, skills: true }
        },
        task: {
          select: { id: true, title: true }
        }
      }
    });

    // Notify client about new bid
    await NotificationService.createNotification(
      task.clientId,
      'NEW_BID',
      {
        taskId: task.id,
        taskTitle: task.title,
        bidderName: bid.freelancer.name,
        bidAmount: bid.amount
      }
    );

    return bid;
  }

  static async getBidsByTask(taskId, userId = null) {
    const bids = await prisma.bid.findMany({
      where: { taskId },
      include: {
        freelancer: {
          select: { id: true, name: true, bio: true, skills: true, portfolioLinks: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return bids;
  }

  static async getBidById(bidId) {
    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: {
        freelancer: {
          select: { id: true, name: true, bio: true, skills: true, portfolioLinks: true }
        },
        task: {
          include: {
            client: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!bid) {
      throw new Error('Bid not found');
    }

    return bid;
  }

  static async acceptBid(bidId, clientId) {
    const bid = await this.getBidById(bidId);
    
    // Verify client owns the task
    if (bid.task.clientId !== clientId) {
      throw new Error('Unauthorized to accept this bid');
    }

    // Update task status and create initial milestone
    const [updatedTask] = await prisma.$transaction(async (prisma) => {
      const task = await prisma.task.update({
        where: { id: bid.taskId },
        data: { status: 'IN_PROGRESS' }
      });

      await prisma.milestone.create({
        data: {
          taskId: bid.taskId,
          description: 'Initial milestone',
          dueDate: bid.task.deadline,
          amount: bid.amount,
          status: 'PENDING'
        }
      });

      return [task];
    });

    // Notify freelancer about accepted bid
    await NotificationService.createNotification(
      bid.freelancerId,
      'BID_ACCEPTED',
      {
        taskId: bid.task.id,
        taskTitle: bid.task.title,
        amount: bid.amount
      }
    );

    return updatedTask;
  }

  static async getUserBids(userId) {
    const bids = await prisma.bid.findMany({
      where: { freelancerId: userId },
      include: {
        task: {
          include: {
            client: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return bids;
  }
}

module.exports = BidService;