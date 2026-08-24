# ─── Stage 1: Build ────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml first for better layer caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn package -DskipTests -B

# ─── Stage 2: Runtime ──────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -S retrouvit && adduser -S retrouvit -G retrouvit

COPY --from=build /app/target/*.jar app.jar

USER retrouvit

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
