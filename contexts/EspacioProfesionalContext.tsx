import { createContext, useContext } from 'react';

/**
 * ¿Esto se está pintando DENTRO de Weë versión creator?
 *
 * Lo pone una sola vez su navegador (`navigation/EspacioProfesionalNavigator`).
 * Las pantallas de Weë AI viven a la vez en la App y aquí, y lo leen para no
 * poner el marco que ya pone Weë versión creator.
 */
const EspacioProfesionalContext = createContext(false);

export const EspacioProfesionalProvider = EspacioProfesionalContext.Provider;
export const useEnEspacioProfesional = (): boolean => useContext(EspacioProfesionalContext);
