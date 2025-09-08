const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');

async function main() {
  console.log('Starting database seed...');

  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();

  // Create demo users - ALL WITH emailVerifiedAt
  const hashedPassword = await bcrypt.hash('password123', 12);
  const now = new Date(); // Current timestamp for emailVerifiedAt

  const admin = await prisma.user.create({
    data: {
      email: 'sboel66@gmail.com', // Updated to your email
      password: await bcrypt.hash('Admin123!', 12),
      name: 'Admin User',
      role: 'ADMIN',
      bio: 'Platform administrator',
      emailVerifiedAt: now // ✅ VERIFIED
    }
  });

  const client = await prisma.user.create({
    data: {
      email: 'client@skilllink.dev',
      password: await bcrypt.hash('Client123!', 12),
      name: 'John Client',
      role: 'CLIENT',
      bio: 'Tech entrepreneur looking for talented developers',
      emailVerifiedAt: now // ✅ VERIFIED
    }
  });

  const freelancer1 = await prisma.user.create({
    data: {
      email: 'freelancer@skilllink.dev',
      password: await bcrypt.hash('Freelancer123!', 12),
      name: 'Sarah Developer',
      role: 'FREELANCER',
      bio: 'Full-stack developer with 5 years of experience in React and Node.js',
      skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'AWS'],
      portfolioLinks: ['https://github.com/sarahdev', 'https://sarahdev.dev'],
      emailVerifiedAt: now // ✅ VERIFIED
    }
  });

  const freelancer2 = await prisma.user.create({
    data: {
      email: 'alex@skilllink.dev',
      password: hashedPassword,
      name: 'Alex Designer',
      role: 'FREELANCER',
      bio: 'UI/UX Designer specializing in modern web applications',
      skills: ['Figma', 'Adobe XD', 'CSS', 'HTML', 'Design Systems'],
      portfolioLinks: ['https://dribbble.com/alexdesigner'],
      emailVerifiedAt: now // ✅ VERIFIED
    }
  });

  // Create demo tasks
  const task1 = await prisma.task.create({
    data: {
      title: 'Build a React E-commerce Website',
      description: 'Looking for an experienced React developer to build a modern e-commerce website with payment integration, user authentication, and admin panel.',
      budget: 2500,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'OPEN',
      clientId: client.id,
      attachments: [
        {
          filename: 'requirements.pdf',
          originalname: 'Project Requirements.pdf',
          size: 1024000,
          mimetype: 'application/pdf'
        }
      ]
    }
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Mobile App UI/UX Design',
      description: 'Need a clean and modern UI/UX design for a fitness tracking mobile app. Should include wireframes, mockups, and design system.',
      budget: 1200,
      deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
      status: 'OPEN',
      clientId: client.id
    }
  });

  const task3 = await prisma.task.create({
    data: {
      title: 'API Integration for CRM System',
      description: 'Integrate third-party APIs (Salesforce, HubSpot) into existing CRM system. Need clean documentation and error handling.',
      budget: 1800,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: 'IN_PROGRESS',
      clientId: client.id
    }
  });

  // Create demo bids
  const bid1 = await prisma.bid.create({
    data: {
      proposal: 'I have extensive experience building e-commerce websites with React. I can deliver a modern, responsive solution with all the features you need including Stripe integration, user management, and a comprehensive admin panel.',
      amount: 2400,
      timeline: '4 weeks',
      freelancerId: freelancer1.id,
      taskId: task1.id
    }
  });

  const bid2 = await prisma.bid.create({
    data: {
      proposal: 'I specialize in mobile app UI/UX design with a focus on user experience and modern design trends. I will provide complete wireframes, high-fidelity mockups, and a design system.',
      amount: 1100,
      timeline: '3 weeks',
      freelancerId: freelancer2.id,
      taskId: task2.id
    }
  });

  const bid3 = await prisma.bid.create({
    data: {
      proposal: 'I have experience integrating various APIs including Salesforce and HubSpot. I can provide clean, well-documented code with proper error handling and testing.',
      amount: 1700,
      timeline: '2 weeks',
      freelancerId: freelancer1.id,
      taskId: task3.id
    }
  });

  // Create demo milestones
  const milestone1 = await prisma.milestone.create({
    data: {
      taskId: task3.id,
      description: 'API research and planning phase',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      amount: 500,
      status: 'IN_REVIEW'
    }
  });

  const milestone2 = await prisma.milestone.create({
    data: {
      taskId: task3.id,
      description: 'Implementation and testing',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      amount: 1200,
      status: 'PENDING'
    }
  });

  // Create demo messages
  await prisma.message.createMany({
    data: [
      {
        content: 'Hi! I\'m interested in working on this project. I have some questions about the requirements.',
        senderId: freelancer1.id,
        taskId: task1.id
      },
      {
        content: 'Hi Sarah! Thanks for your interest. I\'d be happy to answer any questions you have.',
        senderId: client.id,
        taskId: task1.id
      },
      {
        content: 'Great! Could you tell me more about the payment integration requirements?',
        senderId: freelancer1.id,
        taskId: task1.id
      },
      {
        content: 'I need to integrate Stripe for payments and PayPal as a backup option.',
        senderId: client.id,
        taskId: task1.id
      }
    ]
  });

  // Create demo notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: client.id,
        type: 'NEW_BID',
        payload: {
          taskId: task1.id,
          taskTitle: task1.title,
          bidderName: freelancer1.name,
          bidAmount: bid1.amount
        }
      },
      {
        userId: client.id,
        type: 'NEW_BID',
        payload: {
          taskId: task2.id,
          taskTitle: task2.title,
          bidderName: freelancer2.name,
          bidAmount: bid2.amount
        }
      },
      {
        userId: freelancer1.id,
        type: 'BID_ACCEPTED',
        payload: {
          taskId: task3.id,
          taskTitle: task3.title,
          amount: bid3.amount
        }
      }
    ]
  });

  console.log('Database seed completed successfully!');
  console.log('\nDemo accounts:');
  console.log('Admin: sboel66@gmail.com / Admin123!'); // ✅ Updated
  console.log('Client: client@skilllink.dev / Client123!');
  console.log('Freelancer: freelancer@skilllink.dev / Freelancer123!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });