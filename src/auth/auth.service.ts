import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}
  async signup(authDto: AuthDto) {
    // generate the password hash
    try {
      const hash = await argon.hash(authDto.password);
      // save the new user in the db
      const user = await this.prisma.user.create({
        data: {
          email: authDto.email,
          hash,
        },
      });

      // delete hash
      delete user.hash;

      //return the saved user
      return user;
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ForbiddenException('Credentials take');
      }
      throw error;
    }
  }

  async signin(authDto: AuthDto) {
    // find the user by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: authDto.email,
      },
    });
    // if user does not exist throw Exception
    if (!user) {
      throw new ForbiddenException('Credentials incorrect');
    }

    // compare password
    const pwMatches = await argon.verify(user.hash, authDto.password);

    // if password does not exist throw Exception
    if (!pwMatches) {
      throw new ForbiddenException('Credentials incorrect');
    }
    delete user.hash;

    // send back the user
    return {
      msg: user.email + 'User logged!',
      user,
    };
  }
}
