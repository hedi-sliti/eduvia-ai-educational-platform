import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import { CreateReminderDto, ReminderPriority } from './dto/create-reminder.dto';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { Reminder, ReminderDocument } from './schemas/reminder.schema';
import { SupportMessage, SupportMessageDocument } from './schemas/support-message.schema';

@Injectable()
export class RemindersSupportService {
  constructor(
    @InjectModel(Reminder.name)
    private reminderModel: Model<ReminderDocument>,
    @InjectModel(SupportMessage.name)
    private supportMessageModel: Model<SupportMessageDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async createReminder(
    creatorId: string,
    creatorRole: UserRole,
    createReminderDto: CreateReminderDto,
  ): Promise<ReminderDocument> {
    await this.ensureStudent(createReminderDto.studentId);

    const createdReminder = new this.reminderModel({
      studentId: new Types.ObjectId(createReminderDto.studentId),
      createdBy: new Types.ObjectId(creatorId),
      creatorRole,
      title: createReminderDto.title,
      message: createReminderDto.message,
      priority: createReminderDto.priority ?? ReminderPriority.MEDIUM,
      dueDate: createReminderDto.dueDate
        ? new Date(createReminderDto.dueDate)
        : undefined,
      isRead: false,
    });

    return createdReminder.save();
  }

  async listMyReminders(studentId: string): Promise<ReminderDocument[]> {
    return this.reminderModel
      .find({ studentId: new Types.ObjectId(studentId) })
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .exec();
  }

  async listSentReminders(senderId: string): Promise<ReminderDocument[]> {
    return this.reminderModel
      .find({ createdBy: new Types.ObjectId(senderId) })
      .populate('studentId', 'name email role')
      .sort({ createdAt: -1 })
      .exec();
  }

  async markReminderAsRead(
    reminderId: string,
    studentId: string,
  ): Promise<ReminderDocument> {
    const updated = await this.reminderModel
      .findOneAndUpdate(
        {
          _id: reminderId,
          studentId: new Types.ObjectId(studentId),
        },
        {
          isRead: true,
          readAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Reminder not found');
    }

    return updated;
  }

  async createSupportMessage(
    creatorId: string,
    creatorRole: UserRole,
    createSupportMessageDto: CreateSupportMessageDto,
  ): Promise<SupportMessageDocument> {
    await this.ensureStudent(createSupportMessageDto.studentId);

    const createdSupportMessage = new this.supportMessageModel({
      studentId: new Types.ObjectId(createSupportMessageDto.studentId),
      createdBy: new Types.ObjectId(creatorId),
      creatorRole,
      subject: createSupportMessageDto.subject,
      message: createSupportMessageDto.message,
      category: createSupportMessageDto.category,
      isRead: false,
    });

    return createdSupportMessage.save();
  }

  async listMySupportMessages(studentId: string): Promise<SupportMessageDocument[]> {
    return this.supportMessageModel
      .find({ studentId: new Types.ObjectId(studentId) })
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .exec();
  }

  async listSentSupportMessages(senderId: string): Promise<SupportMessageDocument[]> {
    return this.supportMessageModel
      .find({ createdBy: new Types.ObjectId(senderId) })
      .populate('studentId', 'name email role')
      .sort({ createdAt: -1 })
      .exec();
  }

  async markSupportMessageAsRead(
    supportMessageId: string,
    studentId: string,
  ): Promise<SupportMessageDocument> {
    const updated = await this.supportMessageModel
      .findOneAndUpdate(
        {
          _id: supportMessageId,
          studentId: new Types.ObjectId(studentId),
        },
        {
          isRead: true,
          readAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Support message not found');
    }

    return updated;
  }

  private async ensureStudent(studentId: string): Promise<void> {
    const student = await this.userModel
      .findById(studentId)
      .select('_id role')
      .lean()
      .exec();

    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundException('Student not found');
    }
  }
}
