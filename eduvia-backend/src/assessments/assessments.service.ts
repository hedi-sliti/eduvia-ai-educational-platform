import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Assessment, AssessmentDocument } from './schemas/assessment.schema';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectModel(Assessment.name)
    private assessmentModel: Model<AssessmentDocument>,
  ) {}

  async create(
    studentId: string,
    createAssessmentDto: CreateAssessmentDto,
  ): Promise<AssessmentDocument> {
    const createdAssessment = new this.assessmentModel({
      ...createAssessmentDto,
      studentId: new Types.ObjectId(studentId),
    });
    return createdAssessment.save();
  }

  async findAll(): Promise<AssessmentDocument[]> {
    return this.assessmentModel.find().populate('studentId', '-password').exec();
  }

  async findByStudent(studentId: string): Promise<AssessmentDocument[]> {
    return this.assessmentModel
      .find({ studentId: new Types.ObjectId(studentId) })
      .exec();
  }

  async findOne(id: string): Promise<AssessmentDocument> {
    const assessment = await this.assessmentModel
      .findById(id)
      .populate('studentId', '-password')
      .exec();
    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }
    return assessment;
  }

  async update(
    id: string,
    updateAssessmentDto: UpdateAssessmentDto,
  ): Promise<AssessmentDocument> {
    const assessment = await this.assessmentModel
      .findByIdAndUpdate(id, updateAssessmentDto, { new: true })
      .populate('studentId', '-password')
      .exec();
    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }
    return assessment;
  }

  async remove(id: string): Promise<void> {
    const result = await this.assessmentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Assessment not found');
    }
  }
}
