FROM eclipse-temurin:17-jdk AS build

WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw -q -DskipTests dependency:go-offline

COPY src src
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:17-jre

WORKDIR /app
ENV SERVER_PORT=8080
# Render free instances have a tight memory budget. Bound every large JVM
# memory region instead of sizing only the heap, leaving room for native
# libraries, thread stacks and the container runtime.
ENV MALLOC_ARENA_MAX=2
ENV JAVA_TOOL_OPTIONS="-Xms32m -Xmx192m -Xss256k -XX:MaxMetaspaceSize=96m -XX:ReservedCodeCacheSize=32m -XX:MaxDirectMemorySize=32m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Djava.util.concurrent.ForkJoinPool.common.parallelism=1 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080

COPY --from=build /workspace/target/backend-0.0.1-SNAPSHOT.jar app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
