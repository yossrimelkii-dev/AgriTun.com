import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  const connectOptions = {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  } as const;

  const shouldTryLocalFallback =
    process.env.NODE_ENV !== 'production' &&
    uri.startsWith('mongodb+srv://') &&
    uri.includes('.mongodb.net');

  const localFallbackCandidates = [
    process.env.MONGODB_URI_LOCAL,
    'mongodb://localhost:27017/tunagri',
    'mongodb://admin:password@localhost:27017/tunagri?authSource=admin&retryWrites=true',
  ].filter((candidate): candidate is string => Boolean(candidate) && candidate !== uri);

  const connectTarget = async (targetUri: string) => mongoose.connect(targetUri, connectOptions);

  if (!cached.promise) {
    cached.promise = connectTarget(uri).catch(async (error) => {
      if (!shouldTryLocalFallback || localFallbackCandidates.length === 0) {
        throw error;
      }

      for (const candidate of localFallbackCandidates) {
        try {
          return await connectTarget(candidate);
        } catch {
          // try the next local candidate
        }
      }

      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    if (shouldTryLocalFallback && localFallbackCandidates.length > 0) {
      for (const candidate of localFallbackCandidates) {
        try {
          cached.promise = connectTarget(candidate);
          cached.conn = await cached.promise;
          return cached.conn;
        } catch {
          // continue trying other local candidates
        }
      }
    }

    cached.promise = null;
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}
