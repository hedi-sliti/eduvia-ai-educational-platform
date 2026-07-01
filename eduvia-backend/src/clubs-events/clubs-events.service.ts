import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateClubDto } from './dto/create-club.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Club, ClubDocument } from './schemas/club.schema';
import { Event, EventDocument } from './schemas/event.schema';

@Injectable()
export class ClubsEventsService {
  constructor(
    @InjectModel(Club.name) private clubModel: Model<ClubDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async createClub(createClubDto: CreateClubDto, creatorId: string): Promise<ClubDocument> {
    const club = new this.clubModel({
      ...createClubDto,
      createdBy: new Types.ObjectId(creatorId),
      isActive: createClubDto.isActive ?? true,
      isFeatured: createClubDto.isFeatured ?? false,
      relevanceScore: createClubDto.relevanceScore ?? 3,
      memberCount: createClubDto.memberCount ?? 0,
      tags: createClubDto.tags ?? [],
    });

    return club.save();
  }

  async listClubsForStudent(): Promise<ClubDocument[]> {
    return this.clubModel
      .find({ isActive: true })
      .sort({ isFeatured: -1, relevanceScore: -1, createdAt: -1 })
      .exec();
  }

  async listAllClubsForStaff(): Promise<ClubDocument[]> {
    return this.clubModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateClub(id: string, updateClubDto: UpdateClubDto): Promise<ClubDocument> {
    const updated = await this.clubModel
      .findByIdAndUpdate(id, updateClubDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Club not found');
    }

    return updated;
  }

  async deleteClub(id: string): Promise<void> {
    const result = await this.clubModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Club not found');
    }
  }

  async createEvent(createEventDto: CreateEventDto, creatorId: string): Promise<EventDocument> {
    const event = new this.eventModel({
      ...createEventDto,
      clubId: createEventDto.clubId
        ? new Types.ObjectId(createEventDto.clubId)
        : undefined,
      startDate: new Date(createEventDto.startDate),
      endDate: createEventDto.endDate
        ? new Date(createEventDto.endDate)
        : undefined,
      createdBy: new Types.ObjectId(creatorId),
      isPublished: createEventDto.isPublished ?? true,
      isFeatured: createEventDto.isFeatured ?? false,
      relevanceScore: createEventDto.relevanceScore ?? 3,
      tags: createEventDto.tags ?? [],
    });

    return event.save();
  }

  async listEventsForStudent(): Promise<EventDocument[]> {
    return this.eventModel
      .find({ isPublished: true })
      .populate('clubId')
      .sort({ isFeatured: -1, startDate: 1, createdAt: -1 })
      .exec();
  }

  async listAllEventsForStaff(): Promise<EventDocument[]> {
    return this.eventModel
      .find()
      .populate('clubId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateEvent(id: string, updateEventDto: UpdateEventDto): Promise<EventDocument> {
    const payload: any = { ...updateEventDto };
    if (updateEventDto.clubId) {
      payload.clubId = new Types.ObjectId(updateEventDto.clubId);
    }
    if (updateEventDto.startDate) {
      payload.startDate = new Date(updateEventDto.startDate);
    }
    if (updateEventDto.endDate) {
      payload.endDate = new Date(updateEventDto.endDate);
    }

    const updated = await this.eventModel
      .findByIdAndUpdate(id, payload, { new: true })
      .populate('clubId')
      .exec();

    if (!updated) {
      throw new NotFoundException('Event not found');
    }

    return updated;
  }

  async deleteEvent(id: string): Promise<void> {
    const result = await this.eventModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Event not found');
    }
  }

  async getStudentRecommendations(limit = 5): Promise<{
    clubs: ClubDocument[];
    events: EventDocument[];
  }> {
    const safeLimit = Math.min(Math.max(limit, 1), 20);

    const [clubs, events] = await Promise.all([
      this.clubModel
        .find({ isActive: true })
        .sort({ isFeatured: -1, relevanceScore: -1, memberCount: -1, createdAt: -1 })
        .limit(safeLimit)
        .exec(),
      this.eventModel
        .find({ isPublished: true })
        .populate('clubId')
        .sort({ isFeatured: -1, relevanceScore: -1, startDate: 1, createdAt: -1 })
        .limit(safeLimit)
        .exec(),
    ]);

    return { clubs, events };
  }
}
