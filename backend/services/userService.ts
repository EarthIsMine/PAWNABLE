import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../models/userModel';
import { CreateUserDto, UpdateUserDto } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class UserService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * 모든 사용자 조회
   */
  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.find();
  }

  /**
   * ID로 사용자 조회
   */
  async getUserById(user_id: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { user_id } });
  }

  /**
   * 지갑 주소로 사용자 조회
   */
  async getUserByWalletAddress(wallet_address: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { wallet_address } });
  }

  /**
   * 이메일로 사용자 조회
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  /**
   * 새 사용자 생성
   */
  async createUser(dto: CreateUserDto): Promise<User> {
    // 지갑 주소 중복 체크
    const existingWallet = await this.getUserByWalletAddress(dto.wallet_address);
    if (existingWallet) {
      throw new Error('Wallet address already exists');
    }

    // 이메일 중복 체크
    const existingEmail = await this.getUserByEmail(dto.email);
    if (existingEmail) {
      throw new Error('Email already exists');
    }

    const user = this.userRepository.create({
      user_id: uuidv4(),
      wallet_address: dto.wallet_address.toLowerCase(),
      nickname: dto.nickname,
      email: dto.email,
    });

    return await this.userRepository.save(user);
  }

  /**
   * 사용자 정보 업데이트
   */
  async updateUser(user_id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.getUserById(user_id);
    if (!user) {
      throw new Error('User not found');
    }

    // 이메일 변경 시 중복 체크
    if (dto.email && dto.email !== user.email) {
      const existingEmail = await this.getUserByEmail(dto.email);
      if (existingEmail) {
        throw new Error('Email already exists');
      }
    }

    if (dto.nickname) user.nickname = dto.nickname;
    if (dto.email) user.email = dto.email;

    return await this.userRepository.save(user);
  }

  /**
   * 사용자 삭제
   */
  async deleteUser(user_id: string): Promise<boolean> {
    const user = await this.getUserById(user_id);
    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.remove(user);
    return true;
  }

  /**
   * 지갑 인증 후 사용자 조회 또는 생성
   */
  async findOrCreateByWallet(wallet_address: string, nickname?: string): Promise<User> {
    let user = await this.getUserByWalletAddress(wallet_address);

    if (!user) {
      // 새 사용자 생성 (임시 이메일)
      user = await this.createUser({
        wallet_address,
        nickname: nickname || `User_${wallet_address.substring(0, 8)}`,
        email: `${wallet_address.toLowerCase()}@pawnable.temp`,
      });
    }

    return user;
  }
}
