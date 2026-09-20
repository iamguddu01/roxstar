const REWARDS = [
  { id: 1, label: '100 Gold Coins', color: '#f59e0b', textColor: '#1e1b4b', icon: '🪙', weight: 20 },
  { id: 2, label: 'Mystery Gift', color: '#8b5cf6', textColor: '#ffffff', icon: '🎁', weight: 15 },
  { id: 3, label: 'Free Spin Extra', color: '#06b6d4', textColor: '#ffffff', icon: '🔄', weight: 15 },
  { id: 4, label: '250 Gold Coins', color: '#10b981', textColor: '#ffffff', icon: '💰', weight: 12 },
  { id: 5, label: 'VIP Crown', color: '#ec4899', textColor: '#ffffff', icon: '👑', weight: 10 },
  { id: 6, label: 'Jackpot 1000!', color: '#ef4444', textColor: '#ffffff', icon: '🔥', weight: 5 },
  { id: 7, label: '50 Gold Coins', color: '#3b82f6', textColor: '#ffffff', icon: '🪙', weight: 20 },
  { id: 8, label: 'Double Score 2X', color: '#f97316', textColor: '#ffffff', icon: '⚡', weight: 13 },
];

function getRandomReward() {
  const totalWeight = REWARDS.reduce((acc, item) => acc + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < REWARDS.length; i++) {
    if (random < REWARDS[i].weight) {
      return { reward: REWARDS[i], index: i };
    }
    random -= REWARDS[i].weight;
  }
  return { reward: REWARDS[0], index: 0 };
}

module.exports = {
  REWARDS,
  getRandomReward,
};
