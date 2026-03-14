import { Pressable, View } from "react-native";
import { colors, radii, spacing, typography } from "../../../../lib/theme/tokens";
import { Text } from "../../../ui/Text";

type Props = {
  attemptsRemaining: number;
  streakDays: number;
  activeEvent: string | null;
  estimatedDurationMinutes: number;
  onStart: () => void;
  startDisabled?: boolean;
  disabledReason?: string | null;
};

export default function WolfGameHomeCard({
  attemptsRemaining,
  streakDays,
  activeEvent,
  estimatedDurationMinutes,
  onStart,
  startDisabled = false,
  disabledReason = null,
}: Props) {
  return (
    <View
      style={{
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.borderSoft,
        backgroundColor: colors.surfacePanel,
        padding: spacing.md,
      }}
    >
      <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
        Teste dos Lobos
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: 4, lineHeight: 20 }}>
        Desafio diário com 4 fases: Reflexo, Lógica, Conhecimento e Liderança.
      </Text>

      <View style={{ marginTop: spacing.sm, gap: 6 }}>
        <Text style={{ color: "rgba(255,255,255,0.82)" }}>Duração estimada: {estimatedDurationMinutes} min</Text>
        <Text style={{ color: "rgba(255,255,255,0.82)" }}>Desafios por rodada: 4</Text>
        <Text style={{ color: "rgba(255,255,255,0.82)" }}>Tentativas restantes hoje: {attemptsRemaining}</Text>
        <Text style={{ color: "rgba(255,255,255,0.82)" }}>Streak atual: {streakDays} dia(s)</Text>
        {activeEvent ? (
          <View
            style={{
              marginTop: 4,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: "rgba(255,199,0,0.42)",
              backgroundColor: "rgba(255,199,0,0.14)",
              paddingHorizontal: spacing.sm,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: colors.einsteinYellow }} weight="semibold">
              Evento ativo: {activeEvent}
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={onStart}
        disabled={startDisabled}
        style={{
          marginTop: spacing.md,
          height: 46,
          borderRadius: radii.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.einsteinYellow,
          opacity: startDisabled ? 0.55 : 1,
        }}
      >
        <Text style={{ color: colors.einsteinBlue }} weight="bold">
          Iniciar
        </Text>
      </Pressable>

      {disabledReason ? (
        <Text style={{ color: "#fcd34d", marginTop: spacing.xs, lineHeight: 18 }}>{disabledReason}</Text>
      ) : null}
    </View>
  );
}

