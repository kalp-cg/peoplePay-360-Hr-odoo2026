const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const authRepository = require('./auth.repository');

class AuthService {
  async login(email, password) {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      throw { statusCode: 401, message: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' };
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    const { password: _, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  async signup(data) {
    const existing = await authRepository.findByEmail(data.email);
    if (existing) {
      throw { statusCode: 409, message: 'An account with this email already exists.', code: 'EMAIL_EXISTS' };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const newUser = await authRepository.createUser({
      ...data,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role, email: newUser.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    const { password: _, ...userWithoutPassword } = newUser;
    return { token, user: userWithoutPassword };
  }

  async getMe(userId) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw { statusCode: 404, message: 'User not found.', code: 'USER_NOT_FOUND' };
    }
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

module.exports = new AuthService();
