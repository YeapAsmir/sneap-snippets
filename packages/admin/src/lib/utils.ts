// Generate consistent colors based on name
export const getAvatarColors = (name: string) => {
  const colors = [
    'bg-red-500 text-white ',
    'bg-blue-500 text-white ',
    'bg-green-500 text-white ',
    'bg-purple-500 text-white ',
    'bg-orange-500 text-white ',
    'bg-pink-500 text-white ',
    'bg-indigo-500 text-white ',
    'bg-teal-500 text-white ',
    'bg-yellow-500 text-black ',
    'bg-zinc-900 text-white'
  ];
  
  // Use name hash to consistently pick the same color for the same name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};