import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { UserRole } from './users/schemas/user.schema';
import { CoursesService } from './courses/courses.service';
import { AssessmentsService } from './assessments/assessments.service';
import { RecommendationsService } from './recommendations/recommendations.service';
import { Assessment, AssessmentDocument } from './assessments/schemas/assessment.schema';
import { Course, CourseDocument } from './courses/schemas/course.schema';
import { Quiz, QuizAttempt, QuizAttemptDocument, QuizDocument } from './quizzes/schemas/quiz.schema';
import { Progress, ProgressDocument, ProgressRiskLevel } from './progress/schemas/progress.schema';
import {
  Recommendation,
  RecommendationDocument,
} from './recommendations/schemas/recommendation.schema';
import { Reminder, ReminderDocument } from './reminders-support/schemas/reminder.schema';
import { SupportMessage, SupportMessageDocument } from './reminders-support/schemas/support-message.schema';
import { Club, ClubDocument } from './clubs-events/schemas/club.schema';
import { Event, EventDocument } from './clubs-events/schemas/event.schema';
import { ReminderPriority } from './reminders-support/dto/create-reminder.dto';

type SeedMode = 'clean' | 'demo';

type SeedUsers = {
  admin: any;
  teacher: any;
  student: any;
};

type SeedContext = {
  usersService: UsersService;
  coursesService: CoursesService;
  assessmentsService: AssessmentsService;
  recommendationsService: RecommendationsService;
  courseModel: Model<CourseDocument>;
  assessmentModel: Model<AssessmentDocument>;
  recommendationModel: Model<RecommendationDocument>;
  quizModel: Model<QuizDocument>;
  quizAttemptModel: Model<QuizAttemptDocument>;
  progressModel: Model<ProgressDocument>;
  reminderModel: Model<ReminderDocument>;
  supportMessageModel: Model<SupportMessageDocument>;
  clubModel: Model<ClubDocument>;
  eventModel: Model<EventDocument>;
};

function resolveSeedMode(): SeedMode {
  const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
  const rawMode = (modeArg?.split('=')[1] || process.env.EDUVIA_SEED_MODE || 'demo').toLowerCase();
  return rawMode === 'clean' ? 'clean' : 'demo';
}

async function resetDevelopmentData(context: SeedContext) {
  console.log('Clearing development users and collections...');

  await Promise.all([
    context.quizAttemptModel.deleteMany({}),
    context.quizModel.deleteMany({}),
    context.progressModel.deleteMany({}),
    context.reminderModel.deleteMany({}),
    context.supportMessageModel.deleteMany({}),
    context.eventModel.deleteMany({}),
    context.clubModel.deleteMany({}),
    context.recommendationModel.deleteMany({}),
    context.assessmentModel.deleteMany({}),
    context.courseModel.deleteMany({}),
  ]);

  const users = await context.usersService.findAll();
  for (const user of users) {
    await context.usersService.remove(user._id.toString());
  }
}

async function seedEssentialUsers(usersService: UsersService): Promise<SeedUsers> {
  console.log('Seeding essential users...');

  const admin = await usersService.create({
    email: 'admin@eduvia.com',
    password: 'Admin123!',
    name: 'Admin User',
    role: UserRole.ADMIN,
  });
  const teacher = await usersService.create({
    email: 'teacher@eduvia.com',
    password: 'Teacher123!',
    name: 'Teacher User',
    role: UserRole.TEACHER,
  });
  const student = await usersService.create({
    email: 'student@eduvia.com',
    password: 'Student123!',
    name: 'Student User',
    role: UserRole.STUDENT,
  });

  return { admin, teacher, student };
}

async function seedDemoContent(context: SeedContext, users: SeedUsers) {
  const { admin, teacher, student } = users;

  console.log('Seeding courses...');
  const seededCourses = [
    {
      title: 'Introduction to Artificial Intelligence',
      description: 'A beginner-friendly overview of AI concepts, history, and applications.',
      subject: 'Artificial Intelligence',
      level: 'Beginner',
      contentUrl: 'https://eduvia.local/courses/intro-ai',
    },
    {
      title: 'Basics of Programming',
      description: 'Core programming logic, problem solving, and syntax foundations.',
      subject: 'Computer Science',
      level: 'Beginner',
      contentUrl: 'https://eduvia.local/courses/programming-basics',
    },
    {
      title: 'Mathematics for Computer Science',
      description: 'Discrete math and problem-solving essentials for technical learners.',
      subject: 'Mathematics',
      level: 'Intermediate',
      contentUrl: 'https://eduvia.local/courses/math-for-cs',
    },
  ];

  for (const course of seededCourses) {
    await context.coursesService.create(course);
  }

  const createdCourses = await context.courseModel.find().sort({ createdAt: 1 }).exec();
  const aiCourse = createdCourses.find(
    (course) => course.title === 'Introduction to Artificial Intelligence',
  );
  const programmingCourse = createdCourses.find(
    (course) => course.title === 'Basics of Programming',
  );
  const mathCourse = createdCourses.find(
    (course) => course.title === 'Mathematics for Computer Science',
  );

  if (!aiCourse || !programmingCourse || !mathCourse) {
    throw new Error('Expected demo courses were not created correctly.');
  }

  console.log('Seeding assessments (mixed performance for progress/at-risk)...');
  await context.assessmentsService.create(student._id.toString(), {
    answers: {
      q1: 'Artificial intelligence is the science of making machines perform tasks that normally need human intelligence.',
      q2: 'Machine learning helps systems learn from data and improve over time.',
    },
    score: 52,
    feedback: 'Foundational understanding is present, but concept precision and examples need improvement.',
    completed: true,
  });

  await context.assessmentsService.create(student._id.toString(), {
    answers: {
      q1: 'I still confuse AI, ML, and deep learning in some scenarios.',
      q2: 'I need more exercises on algorithmic thinking and problem decomposition.',
    },
    score: 44,
    feedback: 'Needs targeted support and additional practice sessions this week.',
    completed: true,
  });

  console.log('Seeding recommendations...');

  await context.recommendationsService.createForStudent(student._id.toString(), {
    title: 'Revise AI fundamentals',
    description: 'Spend 20 minutes reviewing AI basics and key ML terms before your next quiz.',
    type: 'study',
    priority: 3,
  });

  await context.recommendationsService.createForStudent(student._id.toString(), {
    title: 'Practice with the chatbot',
    description: 'Ask one revision question and read the answer aloud during the demo.',
    type: 'practice',
    priority: 2,
  });

  await context.recommendationsService.createForStudent(student._id.toString(), {
    title: 'Meet your teacher for support',
    description: 'Book a short support check-in to discuss weak quiz topics.',
    type: 'support',
    priority: 4,
  });

  console.log('Seeding quizzes and quiz attempts...');

  const aiQuiz = await context.quizModel.create({
    title: 'AI Essentials Quiz',
    description: 'Covers AI basics and distinctions between AI and ML.',
    courseId: aiCourse._id,
    level: 'Beginner',
    subject: 'Artificial Intelligence',
    isPublished: true,
    timeLimitMinutes: 12,
    questions: [
      {
        prompt: 'What does AI stand for?',
        options: ['Artificial Intelligence', 'Automated Interface', 'Adaptive Internet'],
        correctOption: 0,
        explanation: 'AI stands for Artificial Intelligence.',
      },
      {
        prompt: 'Machine learning is best described as:',
        options: [
          'A subset of AI that learns from data',
          'A hardware optimization method',
          'A networking protocol',
        ],
        correctOption: 0,
        explanation: 'ML is a subset of AI focused on learning patterns from data.',
      },
      {
        prompt: 'Which is an example of AI in education?',
        options: ['Adaptive tutoring chatbot', 'Spreadsheet formula', 'Static PDF only'],
        correctOption: 0,
        explanation: 'Adaptive tutoring systems are AI-powered education tools.',
      },
    ],
  });

  const programmingQuiz = await context.quizModel.create({
    title: 'Programming Basics Quiz',
    description: 'Logic, variables, and control flow fundamentals.',
    courseId: programmingCourse._id,
    level: 'Beginner',
    subject: 'Computer Science',
    isPublished: true,
    timeLimitMinutes: 15,
    questions: [
      {
        prompt: 'A variable is used to:',
        options: ['Store data values', 'Connect to Wi-Fi', 'Replace all functions'],
        correctOption: 0,
      },
      {
        prompt: 'Which statement repeats actions while a condition is true?',
        options: ['loop', 'print', 'return'],
        correctOption: 0,
      },
      {
        prompt: 'What is debugging?',
        options: ['Finding and fixing code issues', 'Deleting all files', 'Compressing videos'],
        correctOption: 0,
      },
    ],
  });

  const mathQuiz = await context.quizModel.create({
    title: 'Discrete Math Quick Check',
    description: 'Logic and set basics for CS learners.',
    courseId: mathCourse._id,
    level: 'Intermediate',
    subject: 'Mathematics',
    isPublished: true,
    timeLimitMinutes: 10,
    questions: [
      {
        prompt: 'Which symbol usually denotes logical AND?',
        options: ['∧', '∨', '¬'],
        correctOption: 0,
      },
      {
        prompt: 'A set with no elements is called:',
        options: ['Empty set', 'Universal set', 'Power set'],
        correctOption: 0,
      },
    ],
  });

  await context.quizAttemptModel.create([
    {
      quizId: aiQuiz._id,
      studentId: student._id,
      answers: [0, 1, 0],
      correctAnswers: 2,
      totalQuestions: 3,
      scorePercent: 66.67,
    },
    {
      quizId: programmingQuiz._id,
      studentId: student._id,
      answers: [0, 2, 2],
      correctAnswers: 1,
      totalQuestions: 3,
      scorePercent: 33.33,
    },
    {
      quizId: mathQuiz._id,
      studentId: student._id,
      answers: [2, 1],
      correctAnswers: 0,
      totalQuestions: 2,
      scorePercent: 0,
    },
  ]);

  console.log('Seeding progress snapshots...');

  const assessmentScores = [52, 44];
  const quizScores = [66.67, 33.33, 0];
  const averageAssessmentScore = Number(
    (assessmentScores.reduce((sum, score) => sum + score, 0) / assessmentScores.length).toFixed(2),
  );
  const averageQuizScore = Number(
    (quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length).toFixed(2),
  );
  const overallScore = Number(((averageAssessmentScore + averageQuizScore) / 2).toFixed(2));
  const riskLevel = overallScore < 60 ? ProgressRiskLevel.AT_RISK : ProgressRiskLevel.MODERATE;

  await context.progressModel.create({
    studentId: student._id,
    assessmentCount: assessmentScores.length,
    averageAssessmentScore,
    quizAttemptsCount: quizScores.length,
    averageQuizScore,
    overallScore,
    riskLevel,
    needsAttention: true,
    latestAssessmentAt: new Date(),
    latestQuizAttemptAt: new Date(),
    recommendations: [
      'Focus on programming and math fundamentals this week.',
      'Schedule a support check-in with your teacher.',
      'Retake one low-scoring quiz after revision.',
    ],
    lastComputedAt: new Date(),
  });

  console.log('Seeding reminders and support messages...');

  await context.reminderModel.create([
    {
      studentId: student._id,
      createdBy: teacher._id,
      creatorRole: UserRole.TEACHER,
      title: 'Weekly Quiz Recovery Plan',
      message:
        'Complete AI Essentials Quiz retake and send me your updated score before Friday.',
      priority: ReminderPriority.HIGH,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      isRead: false,
    },
    {
      studentId: student._id,
      createdBy: admin._id,
      creatorRole: UserRole.ADMIN,
      title: 'Platform Orientation',
      message: 'Review the community clubs and upcoming events to increase engagement.',
      priority: ReminderPriority.MEDIUM,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRead: false,
    },
  ]);

  await context.supportMessageModel.create([
    {
      studentId: student._id,
      createdBy: teacher._id,
      creatorRole: UserRole.TEACHER,
      subject: 'Support session offer',
      message: 'I can help you review weak quiz topics after class on Thursday.',
      category: 'Academic Support',
      isRead: false,
    },
    {
      studentId: student._id,
      createdBy: admin._id,
      creatorRole: UserRole.ADMIN,
      subject: 'Student success resources',
      message: 'Check the support hub and submit a help request if you need extra coaching.',
      category: 'Guidance',
      isRead: false,
    },
  ]);

  console.log('Seeding clubs and events...');

  const aiClub = await context.clubModel.create({
    name: 'AI Innovation Club',
    description: 'Build mini AI projects, share prompts, and practice model evaluation.',
    category: 'Technology',
    tags: ['ai', 'ml', 'projects'],
    memberCount: 28,
    isActive: true,
    isFeatured: true,
    relevanceScore: 5,
    createdBy: teacher._id,
  });

  const codingClub = await context.clubModel.create({
    name: 'Code & Debug Circle',
    description: 'Peer sessions to practice programming logic and debugging workflows.',
    category: 'Computer Science',
    tags: ['coding', 'debugging', 'algorithms'],
    memberCount: 19,
    isActive: true,
    isFeatured: false,
    relevanceScore: 4,
    createdBy: admin._id,
  });

  await context.eventModel.create([
    {
      title: 'AI Project Sprint',
      description: 'Collaborative workshop to build and present a small AI tutoring assistant.',
      clubId: aiClub._id,
      startDate: new Date('2026-07-06T09:00:00.000Z'),
      endDate: new Date('2026-07-06T16:00:00.000Z'),
      location: 'Innovation Lab',
      tags: ['ai', 'workshop', 'project'],
      capacity: 60,
      isPublished: true,
      isFeatured: true,
      relevanceScore: 5,
      createdBy: teacher._id,
    },
    {
      title: 'Programming Recovery Session',
      description: 'Focused support event for students needing help with quiz fundamentals.',
      clubId: codingClub._id,
      startDate: new Date('2026-07-08T13:00:00.000Z'),
      endDate: new Date('2026-07-08T15:00:00.000Z'),
      location: 'Room CS-204',
      tags: ['programming', 'support', 'quiz'],
      capacity: 35,
      isPublished: true,
      isFeatured: false,
      relevanceScore: 4,
      createdBy: admin._id,
    },
  ]);
}

async function logSeedSummary(context: SeedContext, studentId: string, mode: SeedMode) {
  const counts = {
    courses: await context.courseModel.countDocuments(),
    assessments: await context.assessmentModel.countDocuments(),
    recommendations: await context.recommendationModel.countDocuments(),
    quizzes: await context.quizModel.countDocuments(),
    quizAttempts: await context.quizAttemptModel.countDocuments(),
    progress: await context.progressModel.countDocuments(),
    reminders: await context.reminderModel.countDocuments(),
    supportMessages: await context.supportMessageModel.countDocuments(),
    clubs: await context.clubModel.countDocuments(),
    events: await context.eventModel.countDocuments(),
    studentRecommendations: (await context.recommendationsService.findByStudent(studentId)).length,
    studentAssessments: (await context.assessmentsService.findByStudent(studentId)).length,
  };

  console.log(`Seed complete for mode: ${mode}`);
  console.log('Seeded counts:', counts);
  console.log('Essential users:');
  console.log('Admin: admin@eduvia.com / Admin123!');
  console.log('Teacher: teacher@eduvia.com / Teacher123!');
  console.log('Student: student@eduvia.com / Student123!');
}

async function bootstrap() {
  const mode = resolveSeedMode();
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);
  const coursesService = app.get(CoursesService);
  const assessmentsService = app.get(AssessmentsService);
  const recommendationsService = app.get(RecommendationsService);

  const courseModel = app.get<Model<CourseDocument>>(getModelToken(Course.name));
  const assessmentModel = app.get<Model<AssessmentDocument>>(getModelToken(Assessment.name));
  const recommendationModel = app.get<Model<RecommendationDocument>>(
    getModelToken(Recommendation.name),
  );
  const quizModel = app.get<Model<QuizDocument>>(getModelToken(Quiz.name));
  const quizAttemptModel = app.get<Model<QuizAttemptDocument>>(
    getModelToken(QuizAttempt.name),
  );
  const progressModel = app.get<Model<ProgressDocument>>(getModelToken(Progress.name));
  const reminderModel = app.get<Model<ReminderDocument>>(getModelToken(Reminder.name));
  const supportMessageModel = app.get<Model<SupportMessageDocument>>(
    getModelToken(SupportMessage.name),
  );
  const clubModel = app.get<Model<ClubDocument>>(getModelToken(Club.name));
  const eventModel = app.get<Model<EventDocument>>(getModelToken(Event.name));

  const context: SeedContext = {
    usersService,
    coursesService,
    assessmentsService,
    recommendationsService,
    courseModel,
    assessmentModel,
    recommendationModel,
    quizModel,
    quizAttemptModel,
    progressModel,
    reminderModel,
    supportMessageModel,
    clubModel,
    eventModel,
  };

  console.log(`Starting ${mode} seed...`);
  await resetDevelopmentData(context);
  const users = await seedEssentialUsers(usersService);

  if (mode === 'demo') {
    await seedDemoContent(context, users);
  }

  await logSeedSummary(context, users.student._id.toString(), mode);

  await app.close();
}

bootstrap();
