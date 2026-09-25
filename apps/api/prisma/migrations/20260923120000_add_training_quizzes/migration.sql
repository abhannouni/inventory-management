-- CreateEnum
CREATE TYPE "QuizAnswerMode" AS ENUM ('single', 'multiple');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'training_quiz_assigned';

-- CreateTable
CREATE TABLE "training_quizzes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deadline" TIMESTAMP(3) NOT NULL,
    "answer_mode" "QuizAnswerMode" NOT NULL DEFAULT 'single',
    "duration_minutes" INTEGER NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_questions" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "training_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "training_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_assignments" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "score" INTEGER,
    "question_order" JSONB,
    "option_order" JSONB,
    "leave_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "training_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_answers" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "option_ids" TEXT[],
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_quizzes_created_at_idx" ON "training_quizzes"("created_at");

-- CreateIndex
CREATE INDEX "training_questions_quiz_id_idx" ON "training_questions"("quiz_id");

-- CreateIndex
CREATE INDEX "training_options_question_id_idx" ON "training_options"("question_id");

-- CreateIndex
CREATE INDEX "training_assignments_user_id_idx" ON "training_assignments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "training_assignments_quiz_id_user_id_key" ON "training_assignments"("quiz_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "training_answers_assignment_id_question_id_key" ON "training_answers"("assignment_id", "question_id");

-- AddForeignKey
ALTER TABLE "training_quizzes" ADD CONSTRAINT "training_quizzes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_questions" ADD CONSTRAINT "training_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "training_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_options" ADD CONSTRAINT "training_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "training_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "training_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_answers" ADD CONSTRAINT "training_answers_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "training_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_answers" ADD CONSTRAINT "training_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "training_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

