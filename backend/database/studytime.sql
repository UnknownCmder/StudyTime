-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: studytime
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `daily_study_plan`
--

DROP TABLE IF EXISTS `daily_study_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_study_plan` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_num_id` int unsigned NOT NULL,
  `subject_id` int unsigned NOT NULL,
  `plan_date` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_daily_study_plan` (`user_num_id`,`plan_date`),
  KEY `fk_daily_plan_subject` (`subject_id`),
  CONSTRAINT `fk_daily_plan_subject` FOREIGN KEY (`subject_id`) REFERENCES `user_subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_daily_plan_user` FOREIGN KEY (`user_num_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `sid` varchar(300) NOT NULL,
  `sess` text NOT NULL,
  `expired_at` bigint NOT NULL,
  PRIMARY KEY (`sid`),
  KEY `idx_sessions_expired_at` (`expired_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `study_record`
--

DROP TABLE IF EXISTS `study_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `study_record` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_num_id` int unsigned NOT NULL,
  `subject_id` int unsigned DEFAULT NULL,
  `detail` varchar(255) DEFAULT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `rest_time` int NOT NULL DEFAULT '0',
  `pause_start_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_study_record_user_time` (`user_num_id`,`start_time`,`end_time`),
  KEY `fk_record_subject` (`subject_id`),
  CONSTRAINT `fk_record_subject` FOREIGN KEY (`subject_id`) REFERENCES `user_subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_record_user` FOREIGN KEY (`user_num_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_subjects`
--

DROP TABLE IF EXISTS `user_subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_subjects` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_num_id` int unsigned NOT NULL,
  `subject_name` varchar(20) NOT NULL,
  `subject_color` varchar(7) NOT NULL,
  `daily_study_time` int NOT NULL DEFAULT '0',
  `monthly_study_time` int NOT NULL DEFAULT '0',
  `yearly_study_time` int NOT NULL DEFAULT '0',
  `total_study_time` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_subject_name` (`user_num_id`,`subject_name`),
  CONSTRAINT `fk_subject_user` FOREIGN KEY (`user_num_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_total_study_time`
--

DROP TABLE IF EXISTS `user_total_study_time`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_total_study_time` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_num_id` int unsigned NOT NULL,
  `daily_time` int NOT NULL DEFAULT '0',
  `monthly_time` int NOT NULL DEFAULT '0',
  `yearly_time` int NOT NULL DEFAULT '0',
  `total_study_time` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_num_id` (`user_num_id`),
  KEY `idx_total_daily` (`daily_time`),
  KEY `idx_total_monthly` (`monthly_time`),
  KEY `idx_total_yearly` (`yearly_time`),
  CONSTRAINT `fk_total_time_user` FOREIGN KEY (`user_num_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_text_id` varchar(20) NOT NULL,
  `hashed_pw` varchar(300) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_text_id` (`user_text_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `weekly_study_plan`
--

DROP TABLE IF EXISTS `weekly_study_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `weekly_study_plan` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_num_id` int unsigned NOT NULL,
  `subject_id` int unsigned NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_weekly_study_plan` (`user_num_id`,`start_time`,`end_time`),
  KEY `fk_weekly_plan_subject` (`subject_id`),
  CONSTRAINT `fk_weekly_plan_subject` FOREIGN KEY (`subject_id`) REFERENCES `user_subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_weekly_plan_user` FOREIGN KEY (`user_num_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-07  1:12:20
