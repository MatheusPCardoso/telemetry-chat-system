import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(email: string, password: string): Promise<{ success: boolean; userId: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
        },
      });

      return {
        success: true,
        userId: user.id,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtService.sign(
      { userId: user.id, email: user.email },
      { expiresIn: '15m' }
    );

    const refreshTokenSecret = this.configService.get<string>('REFRESH_TOKEN_SECRET');
    const refreshToken = this.jwtService.sign(
      { userId: user.id, type: 'refresh' },
      { secret: refreshTokenSecret, expiresIn: '7d' }
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const refreshTokenSecret = this.configService.get<string>('REFRESH_TOKEN_SECRET');
      const payload = this.jwtService.verify(refreshToken, { secret: refreshTokenSecret });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const accessToken = this.jwtService.sign(
        { userId: user.id, email: user.email },
        { expiresIn: '15m' }
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
