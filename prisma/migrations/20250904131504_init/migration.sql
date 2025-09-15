-- CreateTable
CREATE TABLE "ig_data" (
    "date" TEXT,
    "ig_follows" INTEGER NOT NULL,
    "ig_interactions" TEXT,
    "ig_link_clicks" TEXT,
    "ig_reach" INTEGER NOT NULL,
    "ig_views" INTEGER NOT NULL,
    "ig_visits" TEXT,
    "platform" TEXT,
    "id" SERIAL NOT NULL,

    CONSTRAINT "ig_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ig_audience" (
    "age_gender" TEXT,
    "women" TEXT,
    "men" TEXT,
    "platform" TEXT,
    "id" SERIAL NOT NULL,

    CONSTRAINT "ig_audience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fb_audience" (
    "age_gender" TEXT,
    "women" TEXT,
    "men" TEXT,
    "platform" TEXT,
    "id" SERIAL NOT NULL,

    CONSTRAINT "fb_audience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fb_demo" (
    "country" TEXT,
    "percent" TEXT,
    "platform" TEXT,
    "id" SERIAL NOT NULL,

    CONSTRAINT "fb_demo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atfalna_social_media" (
    "date" TEXT,
    "fb_follows" INTEGER NOT NULL,
    "fb_interactions" TEXT,
    "fb_link_clicks" TEXT,
    "fb_reach" INTEGER NOT NULL,
    "fb_views" INTEGER NOT NULL,
    "fb_visits" INTEGER NOT NULL,
    "platform" TEXT,
    "id" SERIAL NOT NULL,

    CONSTRAINT "atfalna_social_media_pkey" PRIMARY KEY ("id")
);
