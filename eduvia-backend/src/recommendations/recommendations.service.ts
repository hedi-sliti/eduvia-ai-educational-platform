import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Recommendation, RecommendationDocument } from './schemas/recommendation.schema';

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectModel(Recommendation.name)
    private recommendationModel: Model<RecommendationDocument>,
  ) {}

  async findByStudent(studentId: string): Promise<RecommendationDocument[]> {
    return this.recommendationModel
      .find({ studentId: new Types.ObjectId(studentId) })
      .sort({ priority: -1 })
      .exec();
  }

  async createForStudent(
    studentId: string,
    data: Partial<Recommendation>,
  ): Promise<RecommendationDocument> {
    const rec = new this.recommendationModel({
      ...data,
      studentId: new Types.ObjectId(studentId),
    });
    return rec.save();
  }
}
