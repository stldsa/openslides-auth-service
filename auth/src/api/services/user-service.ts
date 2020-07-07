import { uuid } from 'uuidv4';

import { Database } from '../interfaces/database';
import { Constructable, Inject } from '../../util/di';
import { RedisDatabaseAdapter } from '../../adapter/redis-database-adapter';
import { User } from '../../core/models/user';
import { UserHandler } from '../interfaces/user-handler';
import { Datastore } from '../interfaces/datastore';
import { DatastoreAdapter } from '../../adapter/datastore-adapter';
import { HashingHandler } from '../interfaces/hashing-handler';
import { HashingService } from './hashing-service';
import { Validation } from '../interfaces/jwt-validator';

@Constructable(UserHandler)
export class UserService implements UserHandler {
    public name = 'UserService';

    @Inject(Datastore)
    private readonly datastore: DatastoreAdapter;

    @Inject(Database, User)
    private readonly database: RedisDatabaseAdapter;

    @Inject(HashingHandler)
    private readonly hashingHandler: HashingService;

    private readonly userCollection: Map<string, User> = new Map();

    public async create(username: string, password: string): Promise<User> {
        const userId = uuid();
        const user: User = new User({ username, password, userId });
        const done = await this.database.set(User.COLLECTION, userId, user);
        return user;
    }

    public async getUserByCredentials(username: string, password: string): Promise<Validation<User>> {
        const user = await this.datastore.filter<User>('user', 'username', username, [
            'username',
            'password',
            'default_password',
            'id'
        ]);
        if (!user) {
            return { isValid: false, message: 'Username or password is incorrect' };
        }
        if (user.password !== this.hashingHandler.hash(password)) {
            return { isValid: false, message: 'Username or password is incorrect' };
        }
        return { isValid: true, message: 'successful', result: user };
    }

    public async getUserBySessionId(sessionId: string): Promise<Validation<User>> {
        return { isValid: false, message: 'Not implemented' };
    }

    public async getUserByUserId(userId: string): Promise<User | undefined> {
        return await this.datastore.filter<User>('user', 'id', userId, ['username', 'password', 'id']);
    }

    public async hasUser(username: string): Promise<boolean> {
        const answer = await this.datastore.exists<User>('user', 'username', username);
        return answer.exists;
    }

    public getAllUsers(): User[] {
        return Array.from(this.userCollection.values());
    }
}