import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// Use JwtAuthGuard as our main guard
export { JwtAuthGuard as AuthGuard };
