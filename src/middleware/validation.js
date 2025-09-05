const { z } = require('zod');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      });
    }
  };
};

// Auth schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['CLIENT', 'FREELANCER']),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  portfolioLinks: z.array(z.string().url()).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// Task schemas
const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  budget: z.union([
    z.number().positive(),
    z.string().regex(/^\d+(\.\d+)?$/).transform(Number) // accepts string numbers
  ]),
  deadline: z.string().transform(str => new Date(str))
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  budget: z.union([
    z.number().positive(),
    z.string().regex(/^\d+(\.\d+)?$/).transform(Number)
  ]).optional(),
  deadline: z.string().transform(str => new Date(str)).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional()
});

// Bid schemas
const createBidSchema = z.object({
  proposal: z.string().min(1),
  amount: z.number().positive(),
  timeline: z.string().min(1)
});

// Message schemas
const createMessageSchema = z.object({
  content: z.string().min(1).max(1000)
});

// Milestone schemas
const createMilestoneSchema = z.object({
  description: z.string().min(1),
  dueDate: z.string().transform(str => new Date(str)),
  amount: z.number().positive()
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  createTaskSchema,
  updateTaskSchema,
  createBidSchema,
  createMessageSchema,
  createMilestoneSchema
};
//  *         description: Email verified successfully