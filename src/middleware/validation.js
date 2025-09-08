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
  budget: z.union([z.number(), z.string().transform(str => parseFloat(str))]).refine(val => val > 0, "Budget must be positive"),
  deadline: z.string()
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  budget: z.union([z.number(), z.string().transform(str => parseFloat(str))]).refine(val => val > 0, "Budget must be positive").optional(),
  deadline: z.string().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional()
});

// Bid schemas
const createBidSchema = z.object({
  proposal: z.string().min(1),
  amount: z.union([z.number(), z.string().transform(str => parseFloat(str))]).refine(val => val > 0, "Amount must be positive"),
  timeline: z.string().min(1)
});

// Message schemas
const createMessageSchema = z.object({
  content: z.string().min(1).max(1000)
});

// Milestone schemas
const createMilestoneSchema = z.object({
  description: z.string().min(1),
  dueDate: z.string(),
  amount: z.union([z.number(), z.string().transform(str => parseFloat(str))]).refine(val => val > 0, "Amount must be positive")
});

// Profile schemas
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  portfolioLinks: z.array(z.string().url()).optional(),
  profileVisibility: z.enum(['PUBLIC', 'PRIVATE']).optional()
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  createTaskSchema,
  updateTaskSchema,
  createBidSchema,
  createMessageSchema,
  createMilestoneSchema,
  updateProfileSchema
};