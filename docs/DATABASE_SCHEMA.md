# Database Schema

## Table: Transcriptions

### Partition Key (HASH)

- userId: string

### Sort Key (RANGE)

- id: string

### Attributes

- fileName: string
- status: enum ['pending', 'completed', 'failed']
- content: string | null
- s3Path: string
- speechMaticsJobId: string | null
- duration: number | null (segundos)
- fileSize: number
- createdAt: number (timestamp)
- updatedAt: number (timestamp)
- error: string | null

### Global Secondary Index

- GSI: status-createdAt
- Para: findByStatus(userId, status)

### TTL

- expiryDate: Borrar automáticamente después 30 días

### Types (TypeScript)

type TranscriptionStatus = 'pending' | 'completed' | 'failed';

interface Transcription {
userId: string;
id: string;
fileName: string;
status: TranscriptionStatus;
content?: string;
s3Path: string;
speechMaticsJobId?: string;
duration?: number;
fileSize: number;
createdAt: number;
updatedAt: number;
error?: string;
}
