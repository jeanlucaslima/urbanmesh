FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY gradlew gradlew.bat ./
COPY gradle ./gradle
COPY settings.gradle.kts build.gradle.kts gradle.properties ./
COPY resolvers/build.gradle.kts ./resolvers/build.gradle.kts
RUN chmod +x ./gradlew && ./gradlew --no-daemon help >/dev/null 2>&1 || true
COPY src ./src
COPY resolvers ./resolvers
RUN ./gradlew --no-daemon installDist

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/install/viaduct-server /app
EXPOSE 8080
CMD ["/app/bin/viaduct-server"]
