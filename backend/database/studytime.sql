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
  `detail` varchar(100) NOT NULL,
  `isDone` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_daily_study_plan` (`user_num_id`,`plan_date`),
  KEY `fk_daily_plan_subject` (`subject_id`),
  CONSTRAINT `fk_daily_plan_subject` FOREIGN KEY (`subject_id`) REFERENCES `user_subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_daily_plan_user` FOREIGN KEY (`user_num_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daily_study_plan`
--

LOCK TABLES `daily_study_plan` WRITE;
/*!40000 ALTER TABLE `daily_study_plan` DISABLE KEYS */;
/*!40000 ALTER TABLE `daily_study_plan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_verification`
--

DROP TABLE IF EXISTS `email_verification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_verification` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(320) NOT NULL,
  `hashed_code` varchar(300) NOT NULL,
  `expired_at` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email_verification_expired_at` (`expired_at`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_verification`
--

LOCK TABLES `email_verification` WRITE;
/*!40000 ALTER TABLE `email_verification` DISABLE KEYS */;
INSERT INTO `email_verification` VALUES (5,'4444maracles@gmail.com','ab84265ed8df909f19b3ce315bc1df4dfddcb86277b3df79ebdca7a14e49c858',1794034531210),(6,'joonwoo4202@gmail.com','bf4eb02852a8fe3a32c3d2dbe09a118eaeae2080b5a601f6129142f0cd9f944f',1794034917716);
/*!40000 ALTER TABLE `email_verification` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('id8UNLZN-gm7MgCjsDqSLsd8hDogEIqw','{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2026-11-08T10:18:28.066Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":10}',1794133195853);
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `study_record`
--

LOCK TABLES `study_record` WRITE;
/*!40000 ALTER TABLE `study_record` DISABLE KEYS */;
INSERT INTO `study_record` VALUES (8,10,4,'어디까지 함','2026-11-07 10:18:10','2026-11-07 10:18:43',3,NULL);
/*!40000 ALTER TABLE `study_record` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_subjects`
--

LOCK TABLES `user_subjects` WRITE;
/*!40000 ALTER TABLE `user_subjects` DISABLE KEYS */;
INSERT INTO `user_subjects` VALUES (4,10,'수학','#f2be64',30,30,30,30);
/*!40000 ALTER TABLE `user_subjects` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_total_study_time`
--

LOCK TABLES `user_total_study_time` WRITE;
/*!40000 ALTER TABLE `user_total_study_time` DISABLE KEYS */;
INSERT INTO `user_total_study_time` VALUES (2,10,30,30,30,30);
/*!40000 ALTER TABLE `user_total_study_time` ENABLE KEYS */;
UNLOCK TABLES;

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
  `email` varchar(320) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_text_id` (`user_text_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (9,'hello','scrypt:ef501cc65994e7d3951c84844afe4fde:9032f1c4ee2d5c857297be504972abd2e45b7f237bf49252c0e0d6382dcb2afc9dd96f545716235c87ffae3da7c5ecd0ea95d5c642bd8993ea1183570cffc50f','unknown4444user@gmail.com'),(10,'test','scrypt:4a06c52b56030b679f7267f774d631e1:c97dcb1f6f79e3f76c758cfb593e931246322b78044048e68be1a3c3431ccd1d655e586310ba3ed5c6019d61a55c9ad00fe955a31a6a3a2ba41da541fe54c61f','joonwoo4292@gmail.com');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

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

--
-- Dumping data for table `weekly_study_plan`
--

LOCK TABLES `weekly_study_plan` WRITE;
/*!40000 ALTER TABLE `weekly_study_plan` DISABLE KEYS */;
/*!40000 ALTER TABLE `weekly_study_plan` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-08 16:42:12
