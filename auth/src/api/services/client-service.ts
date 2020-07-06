import { Client } from '../../core/models/client/client';
import { ClientHandler } from '../interfaces/client-handler';
import { Database } from '../interfaces/database';
import { Constructable, Inject } from '../../util/di';
import { cryptoKey } from '../../util/helper';
import { RedisDatabaseAdapter } from '../../adapter/redis-database-adapter';

@Constructable(ClientHandler)
export class ClientService {
    public name = 'ClientService';

    @Inject(Database, Client)
    private readonly database: RedisDatabaseAdapter;

    private readonly clientCollection = new Map<string, Client>();

    public constructor() {
        this.init();
    }

    public async create(appName: string, redirectUrl: string, appDescription: string = ''): Promise<Client> {
        const id = cryptoKey();
        const client = new Client({ appName, redirectUrl, appDescription });
        const done = await this.database.set(Client.COLLECTIONSTRING, id, client);
        if (done) {
            this.clientCollection.set(id, client);
        }
        return client;
    }

    public getClientById(clientId: string): Client | undefined {
        return this.getAllClients().find(client => client.clientId === clientId);
    }

    public hasClient(clientId: string): boolean {
        return !!this.getAllClients().find(client => client.clientId === clientId);
    }

    public async setClientSecret(clientId: string, clientSecret: string): Promise<void> {
        const client = this.getClientById(clientId);
        if (client) {
            client.clientSecret = clientSecret;
            this.clientCollection.set(clientId, client);
            await this.database.set(Client.COLLECTIONSTRING, clientId, client);
        }
    }

    public getAllClients(): Client[] {
        return Array.from(this.clientCollection.values());
    }

    private async init(): Promise<void> {
        try {
            await this.getAllClientsFromDatabase()
                .then(clients => this.initClientCollection(clients))
                .catch(e => console.log(e));
        } catch {
            console.log('error');
        }
    }

    private async getAllClientsFromDatabase(): Promise<Client[]> {
        return await this.database.getAll(Client.COLLECTIONSTRING);
    }

    private initClientCollection(clients: Client[]): void {
        for (const client of clients) {
            this.clientCollection.set(client.clientId, client);
        }
    }
}
