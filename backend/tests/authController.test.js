jest.mock('../utils/db', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
  },
}));
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('../utils/db');
const { login } = require('../controllers/authController');

describe('authController.login', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: { email: 'user@example.com', password: 'password123' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('returns a token and user (without passwordHash) on successful login', async () => {
    const fakeUser = {
      id: 1,
      email: 'user@example.com',
      name: 'Test User',
      role: 'USER',
      passwordHash: 'hashed-password',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    prisma.user.findUnique.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('fake.jwt.token');

    await login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      token: 'fake.jwt.token',
      user: {
        id: fakeUser.id,
        email: fakeUser.email,
        name: fakeUser.name,
        role: fakeUser.role,
        createdAt: fakeUser.createdAt,
      },
    });

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.user).not.toHaveProperty('passwordHash');

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ userId: fakeUser.id, role: fakeUser.role }),
      process.env.JWT_SECRET,
      expect.objectContaining({ expiresIn: '24h' })
    );
  });

  it('returns 401 with "Invalid credentials" when password does not match', async () => {
    const fakeUser = {
      id: 1,
      email: 'user@example.com',
      name: 'Test User',
      role: 'USER',
      passwordHash: 'hashed-password',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    prisma.user.findUnique.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(false);

    await login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
  });
});
