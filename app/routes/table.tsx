import { Dice5 } from "lucide-react";
import { ComingSoon } from "~/components/common/coming-soon";

export function meta() {
  return [{ title: "Mesa Virtual · Distop-IA VTT" }];
}

export default function TableRoute() {
  return (
    <ComingSoon
      eyebrow="Tablero"
      title="Mesa Virtual"
      description="Tiradas de d10, iniciativa, mapas y la sangre en tiempo real."
      icon={Dice5}
      features={["Roller d10 con dificultades", "Tracker de iniciativa", "Mapa táctico compartido"]}
    />
  );
}
