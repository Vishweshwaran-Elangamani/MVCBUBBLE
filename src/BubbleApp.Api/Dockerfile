FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /repo

COPY BubbleApp.sln ./
COPY src/BubbleApp.Common/BubbleApp.Common.csproj  src/BubbleApp.Common/
COPY src/BubbleApp.Data/BubbleApp.Data.csproj      src/BubbleApp.Data/
COPY src/BubbleApp.Core/BubbleApp.Core.csproj      src/BubbleApp.Core/
COPY src/BubbleApp.Api/BubbleApp.Api.csproj        src/BubbleApp.Api/

RUN dotnet restore src/BubbleApp.Api/BubbleApp.Api.csproj

COPY src/ src/

RUN dotnet publish src/BubbleApp.Api/BubbleApp.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:5013
EXPOSE 5013
ENTRYPOINT ["dotnet", "BubbleApp.Api.dll"]
