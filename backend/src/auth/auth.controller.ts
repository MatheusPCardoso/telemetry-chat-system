import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() signupDto: SignupDto) {
    const result = await this.authService.signup(
      signupDto.email,
      signupDto.password,
    );
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );
    return { accessToken: result.accessToken, refreshToken: result.refreshToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshDto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(refreshDto.refreshToken);
    return { accessToken: result.accessToken };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(@Request() req) {
    return {
      userId: req.user.userId,
      email: req.user.email,
      message: 'Token is valid',
    };
  }
}
