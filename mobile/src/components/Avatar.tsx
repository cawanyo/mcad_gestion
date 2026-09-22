import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface AvatarProps {
  uri?: string | null;
  firstName?: string;
  lastName?: string;
  size?: number;
}

// Shared by TopHeader (profile button) and ProfileScreen's own card —
// pulled out so both render the exact same photo-or-initials look.
export const Avatar: React.FC<AvatarProps> = ({ uri, firstName, lastName, size = 36 }) => {
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, dimensionStyle]} />;
  }

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  return (
    <View style={[styles.fallback, dimensionStyle]}>
      <Text style={[styles.initials, { fontSize: Math.max(10, size * 0.38) }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: { backgroundColor: theme.colors.border },
  fallback: { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontWeight: '900' }
});
