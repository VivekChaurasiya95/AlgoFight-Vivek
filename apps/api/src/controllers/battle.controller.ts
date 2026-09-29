import { BattleRoomService, RatingService } from "@algofight/application";
import {
    PrismaBattleRoomRepository,
    PrismaProblemRepository,
    PrismaUserRepository,
} from "@algofight/database";

export class BattleController {
    private readonly battleRoomService: BattleRoomService;
    private readonly ratingService: RatingService;
    private readonly userRepository: PrismaUserRepository;

    constructor() {
        const battleRoomRepository = new PrismaBattleRoomRepository();
        const problemRepository = new PrismaProblemRepository();
        const userRepository = new PrismaUserRepository();

        this.userRepository = userRepository;
        this.ratingService = new RatingService(userRepository);
        this.battleRoomService = new BattleRoomService(
            battleRoomRepository,
            problemRepository,
            this.ratingService
        );
    }

    private async resolveUserId(identifier: string, authUser?: { id: string; email?: string; username?: string }): Promise<string> {
        let user = await this.userRepository.getUserById(identifier);
        if (!user && authUser && (authUser.id === identifier || authUser.email === identifier)) {
            const safeEmail = authUser.email || `${authUser.id.toLowerCase().replace(/[^a-z0-9_]/g, "")}_${Date.now()}@algofight.local`;
            const safeUsername = authUser.username || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
            user = await this.userRepository.upsertUser({
                id: authUser.id,
                email: safeEmail,
                username: safeUsername,
            });
        }
        if (!user) {
            const clean = identifier.toLowerCase().replace(/[^a-z0-9_]/g, "") || "user";
            const safeEmail = `${clean}_${Date.now()}@algofight.local`;
            user = await this.userRepository.upsertUser({
                id: identifier,
                email: safeEmail,
                username: `Player_${Math.floor(1000 + Math.random() * 9000)}`,
            });
        }
        return user.id;
    }

    private async resolveUser(authUser: { id: string; email?: string; username?: string }): Promise<string> {
        let user = await this.userRepository.getUserById(authUser.id);
        if (!user) {
            const safeEmail = authUser.email || `${authUser.id.toLowerCase().replace(/[^a-z0-9_]/g, "")}_${Date.now()}@algofight.local`;
            const safeUsername = authUser.username || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
            user = await this.userRepository.upsertUser({
                id: authUser.id,
                email: safeEmail,
                username: safeUsername,
            });
        }
        return user.id;
    }

    async createRoom(
        authUser: { id: string; email?: string; username?: string },
        maxPlayers = 2,
        timeLimitMinutes = 15,
        difficulty = "MIX",
        questionCount = 3,
        isFriendly?: boolean,
        problemIds?: string[]
    ) {
        const resolvedHostId = await this.resolveUser(authUser);
        return this.battleRoomService.createRoom({
            hostId: resolvedHostId,
            maxPlayers,
            timeLimitMinutes,
            difficulty,
            questionCount,
            isFriendly,
            problemIds,
        });
    }

    async getRoom(idOrCode: string) {
        return this.battleRoomService.getRoom(idOrCode);
    }

    async joinRoom(idOrCode: string, userId: string, authUser?: { id: string; email?: string; username?: string }) {
        const resolvedUserId = await this.resolveUserId(userId, authUser);
        return this.battleRoomService.joinRoom(idOrCode, resolvedUserId);
    }

    async leaveRoom(roomId: string, userId: string) {
        const resolvedUserId = await this.resolveUserId(userId);
        return this.battleRoomService.leaveRoom(roomId, resolvedUserId);
    }

    async kickPlayer(roomId: string, hostId: string, targetUserId: string) {
        const resolvedHostId = await this.resolveUserId(hostId);
        const resolvedTargetUserId = await this.resolveUserId(targetUserId);
        return this.battleRoomService.kickPlayer(roomId, resolvedHostId, resolvedTargetUserId);
    }

    async setPlayerReady(roomId: string, userId: string, isReady: boolean) {
        const resolvedUserId = await this.resolveUserId(userId);
        return this.battleRoomService.setPlayerReady(roomId, resolvedUserId, isReady);
    }

    async startBattle(roomId: string, hostId: string, problemId?: string) {
        const resolvedHostId = await this.resolveUserId(hostId);
        return this.battleRoomService.startBattle(roomId, resolvedHostId, problemId);
    }

    async finishBattle(roomId: string) {
        return this.battleRoomService.finishBattle(roomId);
    }
}
