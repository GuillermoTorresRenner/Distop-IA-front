/**
 * Descripciones cortas para cada elemento de la hoja de personaje (V20).
 * Curadas a partir del manual; mantenemos 1-2 frases por entrada.
 */

export const ATTR_TOOLTIPS: Record<string, string> = {
  // Físicos
  Fuerza: "Capacidad muscular del cuerpo. Levantar, romper, daño cuerpo a cuerpo.",
  Destreza: "Coordinación, agilidad y reflejos finos. Esquivar y atinar golpes.",
  Resistencia: "Aguante físico. Resistir daño, fatiga y enfermedades.",
  // Sociales
  Carisma: "Atractivo personal y persuasión. Inspira a otros sin manipularlos.",
  Manipulación: "Dirigir la conducta de otros mediante engaño o sutileza.",
  Apariencia: "Belleza física e impacto visual; influye en primeras impresiones.",
  // Mentales
  Percepción: "Capacidad de observar y reaccionar al entorno con los sentidos.",
  Inteligencia: "Razonamiento, memoria y comprensión de problemas complejos.",
  Astucia: "Reacción mental, ingenio y pensar bajo presión.",
};

export const ABILITY_TOOLTIPS: Record<string, string> = {
  // Talentos
  Alerta: "Notar peligro o detalles sutiles del entorno antes que otros.",
  Atletismo: "Correr, saltar, trepar y demás proezas físicas.",
  Callejeo: "Conocer la calle: contactos, mercado negro, supervivencia urbana.",
  Empatía: "Leer emociones y motivaciones de otros.",
  Esquivar: "Evitar ataques y peligros con movimiento defensivo.",
  Expresión: "Comunicar con palabras escritas o habladas; arte, oratoria.",
  Intimidación: "Forzar conducta mediante amenazas, presencia o miedo.",
  Liderazgo: "Inspirar y coordinar a grupos hacia un objetivo común.",
  Pelea: "Combate cuerpo a cuerpo sin armas: puños, agarres, mordiscos.",
  Subterfugio: "Mentir convincentemente, ocultar intenciones, manipular sin que se note.",
  // Técnicas
  "Armas C. C.": "Combate con armas cuerpo a cuerpo: hojas, garrotes, etc.",
  "Armas de Fuego": "Manejo y precisión con armas a distancia (pistolas, rifles).",
  Conducir: "Manejar vehículos terrestres, desde autos hasta camiones.",
  Etiqueta: "Conocer protocolos y maneras de distintas sociedades, incluida la Camarilla.",
  Interpretación: "Actuar, cantar, danzar; el arte performativo.",
  Pericias: "Habilidades técnicas y artesanales: reparar, fabricar, etc.",
  Seguridad: "Forzar y burlar cerraduras, alarmas y sistemas de seguridad.",
  Sigilo: "Moverse sin ser visto ni oído.",
  Supervivencia: "Sobrevivir y rastrear en entornos salvajes u hostiles.",
  "Trato con Animales": "Calmar, adiestrar o trabajar con bestias.",
  // Conocimientos
  Academicismo: "Cultura general, humanidades, historia y arte.",
  Ciencia: "Disciplinas científicas (química, física, biología).",
  Finanzas: "Mercados, economía y manejo del dinero a gran escala.",
  Informática: "Computadoras, programación y redes.",
  Investigación: "Buscar pistas, archivos y conexiones; método deductivo.",
  Leyes: "Conocimiento del sistema legal y la jurisprudencia.",
  Lingüística: "Idiomas adicionales y comprensión de lenguas raras.",
  Medicina: "Atención médica, anatomía, farmacología.",
  Ocultismo: "Saber esotérico: lo paranormal, brujería, sectas, mitología.",
  Política: "Sistemas de poder, gobierno e intrigas internas.",
};

export const VIRTUE_TOOLTIPS: Record<string, string> = {
  Conciencia:
    "Reconocer el bien y el mal. Base de la Humanidad: cae cuando cometes actos atroces.",
  Convicción:
    "Versión de Sendas no humanas: certeza moral basada en un código alternativo.",
  Autocontrol:
    "Resistir la Bestia en momentos de hambre, miedo o ira. Evita el frenesí.",
  Instintos:
    "Versión de Sendas: dejarse guiar por la Bestia sin perder el control.",
  Coraje:
    "Resistir el Rötschreck (terror) ante fuego, luz solar o lo verdaderamente espantoso.",
};

export const STATE_TOOLTIPS = {
  humanity:
    "Tu vínculo con la moral humana (0-10). A menos Humanidad, más cerca estás de la Bestia.",
  path:
    "Nivel de tu Senda alternativa (Senda de la Sangre, Honor, etc.). Sustituye a la Humanidad.",
  willpowerMax:
    "Voluntad permanente (1-10): tu firmeza mental como atributo. Es el techo de la Voluntad actual y solo cambia con experiencia.",
  willpowerCurrent:
    "Voluntad actual (0..permanente): los puntos que tenés ahora mismo. Se gastan para resistir, ganar un éxito automático en una tirada o anular un penalizador por heridas.",
  bloodPool:
    "Sangre almacenada (0-20 según generación). La gastas para curar, alimentar disciplinas o aparentar humanidad.",
  experience: "Puntos de experiencia para mejorar al personaje entre sesiones.",
};

export const HEALTH_TOOLTIPS: Record<string, string> = {
  Magullado: "Sin penalización. Heridas superficiales o moretones.",
  Lastimado: "Penalización -1 a las acciones físicas.",
  Lesionado: "Penalización -1 y movimiento reducido a medio normal.",
  Herido: "Penalización -2; cualquier acción extenuante puede empeorar.",
  Malherido: "Penalización -2 y movimiento muy reducido.",
  Tullido: "Penalización -5; apenas puedes moverte.",
  Incapacitado: "Sin acciones posibles; al borde del torpor o la Muerte Final.",
};

export const HEALTH_LEGEND = {
  empty: "Sano. Sin daño en este nivel.",
  bashing:
    "Daño contundente (/). Causado por golpes, caídas no letales. Se cura rápido.",
  lethal:
    "Daño letal/agravado (X). Cuchilladas, balas, fuego, luz solar. Para los vampiros muchos son agravados y requieren mucha sangre para curarse.",
};

export const IDENTITY_TOOLTIPS = {
  name: "Nombre del vástago. Puede ser un alias o el original mortal.",
  concept:
    "Un par de palabras que resumen quién es el personaje (ej. 'Detective caído', 'Anarquista poeta').",
  chronicleName: "Nombre libre de la crónica donde juegas a este personaje.",
  generation:
    "Distancia respecto a Caín. Cuanto menor el número, más poderoso (4ª = antediluviano, 13ª = sangre débil).",
  haven:
    "Refugio donde duermes durante el día, protegido del sol y enemigos.",
  clan:
    "Linaje vampírico. Determina disciplinas y debilidad de clan.",
  nature:
    "Tu yo verdadero — la motivación profunda. Recuperas Voluntad al actuar acorde.",
  demeanor:
    "La máscara que muestras al mundo. Puede coincidir o no con tu naturaleza.",
};
