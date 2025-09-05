const { prisma } = require('../config/database');

class TaskService {
  static async createTask(userId, taskData) {
    const task = await prisma.task.create({
      data: {
        ...taskData,
        clientId: userId
      },
      include: {
        client: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { bids: true }
        }
      }
    });

    return task;
  }

  static async getAllTasks(filters = {}) {
    const { status, minBudget, maxBudget, search, page = 1, limit = 10 } = filters;
    
    const where = {
      status: 'OPEN',
      ...(status && { status }),
      ...(minBudget && { budget: { gte: parseFloat(minBudget) } }),
      ...(maxBudget && { budget: { lte: parseFloat(maxBudget) } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          client: {
            select: { id: true, name: true }
          },
          _count: {
            select: { bids: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.task.count({ where })
    ]);

    return {
      tasks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getTaskById(taskId, userId = null) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        client: {
          select: { id: true, name: true, email: true }
        },
        bids: {
          include: {
            freelancer: {
              select: { id: true, name: true, bio: true, skills: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        milestones: {
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { 
            bids: true,
            messages: true 
          }
        }
      }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Check if user has permission to view this task
    if (userId && task.clientId !== userId && 
        !task.bids.some(bid => bid.freelancerId === userId)) {
      // If user is not the client or doesn't have a bid, only return basic info
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        budget: task.budget,
        deadline: task.deadline,
        status: task.status,
        createdAt: task.createdAt,
        client: task.client,
        _count: task._count
      };
    }

    return task;
  }

  static async updateTask(taskId, userId, updateData) {
    // Verify ownership
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, clientId: userId }
    });

    if (!existingTask) {
      throw new Error('Task not found or unauthorized');
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        client: {
          select: { id: true, name: true }
        },
        _count: {
          select: { bids: true }
        }
      }
    });

    return task;
  }

  static async deleteTask(taskId, userId) {
    // Verify ownership
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, clientId: userId }
    });

    if (!existingTask) {
      throw new Error('Task not found or unauthorized');
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

    return { message: 'Task deleted successfully' };
  }

  static async getUserTasks(userId, role) {
    const where = role === 'CLIENT' 
      ? { clientId: userId }
      : { bids: { some: { freelancerId: userId } } };

    const tasks = await prisma.task.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true }
        },
        bids: role === 'CLIENT' ? {
          include: {
            freelancer: {
              select: { id: true, name: true }
            }
          }
        } : {
          where: { freelancerId: userId },
          include: {
            freelancer: {
              select: { id: true, name: true }
            }
          }
        },
        milestones: true,
        _count: {
          select: { bids: true, messages: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return tasks;
  }
}

module.exports = TaskService;