import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../logging/log.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let _prismaService: PrismaService;
  let _jwtService: JwtService;
  let _configService: ConfigService;
  let _logService: LogService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockLogService = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LogService,
          useValue: mockLogService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    _prismaService = module.get<PrismaService>(PrismaService);
    _jwtService = module.get<JwtService>(JwtService);
    _configService = module.get<ConfigService>(ConfigService);
    _logService = module.get<LogService>(LogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    const email = 'test@example.com';
    const password = 'password123';

    it('should create a new user with hashed password', async () => {
      const mockUser = {
        id: 'user-id-123',
        email,
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.signup(email, password);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email,
          passwordHash: 'hashed-password',
        },
      });
      expect(result).toEqual({
        success: true,
        userId: mockUser.id,
      });
      
    });

    it('should throw ConflictException if email already exists', async () => {
      const existingUser = {
        id: 'existing-user-id',
        email,
        passwordHash: 'existing-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

      await expect(service.signup(email, password)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.signup(email, password)).rejects.toThrow(
        'Email already registered',
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = 'hashed-password';

    
    it('should return access token and refresh token for valid credentials', async () => {
      const mockUser = {
        id: 'user-id-123',
        email,
        passwordHash: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);
      mockConfigService.get.mockReturnValue('refresh-secret');

      const result = await service.login(email, password);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { userId: mockUser.id, email: mockUser.email },
        { expiresIn: '15m' }
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { userId: mockUser.id, type: 'refresh' },
        { secret: 'refresh-secret', expiresIn: '7d' }
      );
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
      
    });

    
    it('should throw UnauthorizedException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(email, password)).rejects.toThrow(
        'Invalid credentials',
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      
    });

    
    it('should throw UnauthorizedException if password is invalid', async () => {
      const mockUser = {
        id: 'user-id-123',
        email,
        passwordHash: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(email, password)).rejects.toThrow(
        'Invalid credentials',
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      
    });

    
    it('should generate access token with 15 minute expiration', async () => {
      const mockUser = {
        id: 'user-id-123',
        email,
        passwordHash: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('refresh-secret');

      await service.login(email, password);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { userId: mockUser.id, email: mockUser.email },
        { expiresIn: '15m' }
      );
    });

    
    it('should generate refresh token with 7 day expiration', async () => {
      const mockUser = {
        id: 'user-id-123',
        email,
        passwordHash: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('refresh-secret');

      await service.login(email, password);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { userId: mockUser.id, type: 'refresh' },
        { secret: 'refresh-secret', expiresIn: '7d' }
      );
    });
  });

  describe('refreshToken', () => {
    const validRefreshToken = 'valid-refresh-token';
    const refreshTokenSecret = 'refresh-secret';

    it('should return new access token for valid refresh token', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPayload = {
        userId: mockUser.id,
        type: 'refresh',
      };

      const mockAccessToken = 'new-access-token';

      mockConfigService.get.mockReturnValue(refreshTokenSecret);
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue(mockAccessToken);

      const result = await service.refreshToken(validRefreshToken);

      expect(mockConfigService.get).toHaveBeenCalledWith('REFRESH_TOKEN_SECRET');
      expect(mockJwtService.verify).toHaveBeenCalledWith(validRefreshToken, {
        secret: refreshTokenSecret,
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { userId: mockUser.id, email: mockUser.email },
        { expiresIn: '15m' }
      );
      expect(result).toEqual({
        accessToken: mockAccessToken,
      });
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      mockConfigService.get.mockReturnValue(refreshTokenSecret);
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token',
      );

      expect(mockJwtService.verify).toHaveBeenCalledWith('invalid-token', {
        secret: refreshTokenSecret,
      });
    });

    it('should throw UnauthorizedException if refresh token is expired', async () => {
      mockConfigService.get.mockReturnValue(refreshTokenSecret);
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      const mockPayload = {
        userId: 'non-existent-user-id',
        type: 'refresh',
      };

      mockConfigService.get.mockReturnValue(refreshTokenSecret);
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(validRefreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockPayload.userId },
      });
    });
  });
});
