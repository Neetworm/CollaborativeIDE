FROM eclipse-temurin:21-jdk-alpine

RUN addgroup -S sandbox && adduser -S sandbox -G sandbox

ENV PATH="/opt/java/openjdk/bin:${PATH}"

USER sandbox
WORKDIR /tmp

CMD ["java", "Main"]