const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { client: redis } = require('../config/redis');
const { sendEmail } = require('../config/email');
const crypto = require('crypto');

class AuthService {
  static generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async register(userData) {
    const { email, password, name, role, bio, skills, portfolioLinks } = userData;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification code
    const verificationCode = this.generateVerificationCode();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        bio,
        skills,
        portfolioLinks
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bio: true,
        skills: true,
        portfolioLinks: true,
        createdAt: true
      }
    });

    // Store verification code in Redis
    await redis.setEx(`verification_code:${user.id}`, 600, verificationCode); // 10 minutes

    // Send verification email
    await this.sendVerificationEmail(user.email, user.name, verificationCode);

    return {
      user,
      message: 'Registration successful. Please check your email for verification code.'
    };
  }

  static async verifyEmail(userId, code) {
    // Get stored code from Redis
    const storedCode = await redis.get(`verification_code:${userId}`);
    
    if (!storedCode || storedCode !== code) {
      throw new Error('Invalid or expired verification code');
    }

    // Update user as verified
    const user = await prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bio: true,
        skills: true,
        portfolioLinks: true,
        emailVerifiedAt: true,
        createdAt: true
      }
    });

    // Remove verification code from Redis
    await redis.del(`verification_code:${userId}`);

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(userId);

    // Store refresh token in Redis
    await redis.setEx(`refresh_token:${userId}`, 
      7 * 24 * 60 * 60, // 7 days
      refreshToken
    );

    return {
      user,
      accessToken,
      refreshToken
    };
  }

  static async resendVerificationCode(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, emailVerifiedAt: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerifiedAt) {
      throw new Error('Email already verified');
    }

    // Generate new verification code
    const verificationCode = this.generateVerificationCode();
    
    // Store in Redis
    await redis.setEx(`verification_code:${userId}`, 600, verificationCode);
    
    // Send email
    await this.sendVerificationEmail(user.email, user.name, verificationCode);
    
    return { message: 'Verification code sent successfully' };
  }

  static async sendVerificationEmail(email, name, code) {
    const subject = 'Verify Your SkillLink Account';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">SkillLink</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">Welcome to SkillLink, ${name}!</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
            Thank you for signing up! To complete your registration, please verify your email address using the code below:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #2563eb; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 8px; display: inline-block;">
              ${code}
            </div>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            This code will expire in 10 minutes for security reasons.
          </p>
        </div>
        
        <div style="text-align: center; color: #9ca3af; font-size: 12px;">
          <p>If you didn't create an account with SkillLink, please ignore this email.</p>
          <p>&copy; 2024 SkillLink. All rights reserved.</p>
        </div>
      </div>
    `;
    
    await sendEmail(email, subject, html);
  }
  static async login(email, password) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if email is verified
    if (!user.emailVerifiedAt) {
      throw new Error('Please verify your email before logging in');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user.id);

    // Store refresh token in Redis
    await redis.setEx(`refresh_token:${user.id}`, 
      7 * 24 * 60 * 60, // 7 days
      refreshToken
    );

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken
    };
  }

  static async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      // Check if refresh token exists in Redis
      const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(decoded.userId);

      // Update refresh token in Redis
      await redis.setEx(`refresh_token:${decoded.userId}`, 
        7 * 24 * 60 * 60, // 7 days
        newRefreshToken
      );

      return {
        accessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  static async logout(userId) {
    // Remove refresh token from Redis
    await redis.del(`refresh_token:${userId}`);
  }

  static generateTokens(userId) {
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return { accessToken, refreshToken };
  }
}

module.exports = AuthService;