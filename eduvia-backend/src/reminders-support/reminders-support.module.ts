import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { RemindersSupportController } from './reminders-support.controller';
import { RemindersSupportService } from './reminders-support.service';
import { Reminder, ReminderSchema } from './schemas/reminder.schema';
import {
  SupportMessage,
  SupportMessageSchema,
} from './schemas/support-message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reminder.name, schema: ReminderSchema },
      { name: SupportMessage.name, schema: SupportMessageSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [RemindersSupportController],
  providers: [RemindersSupportService],
  exports: [RemindersSupportService],
})
export class RemindersSupportModule {}
