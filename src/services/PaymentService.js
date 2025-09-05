const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { prisma } = require('../config/database');
const NotificationService = require('./NotificationService');

class PaymentService {
  static async createPaymentIntent(taskId, milestoneId, userId) {
    // Verify user is the client for this task
    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        task: {
          clientId: userId
        }
      },
      include: {
        task: {
          include: {
            client: true
          }
        }
      }
    });

    if (!milestone) {
      throw new Error('Milestone not found or unauthorized');
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(milestone.amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        taskId,
        milestoneId,
        clientId: userId
      }
    });

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        taskId,
        milestoneId,
        amount: milestone.amount,
        status: 'PENDING',
        stripePaymentIntentId: paymentIntent.id
      }
    });

    return {
      payment,
      clientSecret: paymentIntent.client_secret
    };
  }

  static async handleWebhook(signature, body) {
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  }

  static async handlePaymentSuccess(paymentIntent) {
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: {
        milestone: {
          include: {
            task: {
              include: {
                bids: {
                  where: {
                    task: {
                      status: 'IN_PROGRESS'
                    }
                  },
                  include: {
                    freelancer: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!payment) {
      console.error('Payment not found for successful payment intent:', paymentIntent.id);
      return;
    }

    // Update payment and milestone status
    await prisma.$transaction(async (prisma) => {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED' }
      });

      await prisma.milestone.update({
        where: { id: payment.milestoneId },
        data: { status: 'APPROVED' }
      });
    });

    // Notify freelancer about payment
    const freelancer = payment.milestone.task.bids[0]?.freelancer;
    if (freelancer) {
      await NotificationService.createNotification(
        freelancer.id,
        'PAYMENT_RECEIVED',
        {
          taskId: payment.taskId,
          amount: payment.amount,
          milestoneDescription: payment.milestone.description
        }
      );
    }
  }

  static async handlePaymentFailure(paymentIntent) {
    await prisma.payment.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: 'FAILED' }
    });
  }

  static async getPaymentHistory(userId, role) {
    const where = role === 'CLIENT'
      ? { task: { clientId: userId } }
      : { task: { bids: { some: { freelancerId: userId } } } };

    const payments = await prisma.payment.findMany({
      where,
      include: {
        task: {
          select: { id: true, title: true }
        },
        milestone: {
          select: { id: true, description: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return payments;
  }
}

module.exports = PaymentService;