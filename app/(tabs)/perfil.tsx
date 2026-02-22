import { router } from "expo-router";
import { Alert } from "react-native";
import StitchScaffoldScreen from "../../components/stitch/StitchScaffoldScreen";
import { supabase } from "../../lib/supabase/client";

export default function PerfilScreen() {
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Erro ao sair", error.message);
      return;
    }
    router.replace("/(marketing)");
  };

  return (
    <StitchScaffoldScreen
      title="Perfil"
      subtitle="Configurações e conta"
      sections={[
        {
          title: "Conta",
          body: "Gerencie email, senha, notificações e preferências do aluno.",
          badge: "ATIVO",
        },
        {
          title: "Privacidade",
          body: "Defina o que aparece no perfil público e no ranking geral.",
        },
      ]}
      ctas={[
        {
          label: "Editar perfil",
          onPress: () => {},
          tone: "secondary",
        },
        { label: "Sair", onPress: handleSignOut, tone: "primary" },
      ]}
    />
  );
}
