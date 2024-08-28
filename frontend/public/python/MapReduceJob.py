import os, json, sys, time, traceback
from functools import wraps
from typing import Literal

def log_error(phase_name: str, error: Exception):
    """Guarda el error en un archivo JSON"""

    error_details = ''.join(traceback.format_exception(type(error), error, error.__traceback__))
    with open('/stderr.json', 'w') as errors_file:
        json.dump({f"{phase_name}Code": f"[{phase_name}] -> {error_details}"}, errors_file)

def read_code(file_path: str, instance: 'MapReduceJob'):
    """Ejecuta el código de un archivo y retorna si está vacío"""

    with open(file_path) as file:
        code = file.read()
        exec(code, {'write': instance.write}, instance.__dict__)
        return bool(code.strip())

def load_json(file_path: str):
    """Retorna el contenido y tamaño de un archivo JSON"""

    with open(file_path) as file:
        data = json.load(file)
    
    return data, os.path.getsize(file_path)

def write_keys(dict_to_write: dict, file_name: str):
    """Escribe un diccionario en un archivo JSON, convirtiendo las claves de tipo tupla a strings, y retorna el tamaño del archivo"""

    with open(file_name, 'w') as file:
        json.dump({str(k) if isinstance(k, tuple) else k: v for k, v in dict_to_write.items()}, file)

    return os.path.getsize(file_name)

def save_statistics(statistics: dict):
    """Guarda las estadísticas en un archivo JSON"""

    with open('/sizes.json', 'w') as statistics_file:
        json.dump(statistics, statistics_file)

def clean_up():
    """Elimina archivos temporales"""

    if os.path.exists('/stderr.json'):
        os.remove("/stderr.json")

def safe_execute(phase):
    @wraps(phase)
    def wrapper(self: 'MapReduceJob'):
        try:
            phase_name : Literal['map', 'combine', 'reduce'] = phase.__name__          # se obtiene el nombre de la etapa

            self.execute_phase = read_code(f'/{phase_name}_code.py', self)             # se lee el código de la etapa

            self.current_results = getattr(self, f'{phase_name}_results')              # se setea la referencia a los resultados de la etapa actual
            
            start_time = time.perf_counter_ns()                                        # se obtiene el tiempo inicial

            result = phase(self)                                                       # se ejecuta la etapa

            self.statistics.update(                                                    # se guardan las estadísticas de la etapa
                {
                    f'{phase_name}Time': time.perf_counter_ns() - start_time,                               # tiempo de ejecución
                    f'{phase_name}Count': self.invocations,                                                 # cantidad de invocaciones
                    f'{phase_name}Input': self.input_size,                                                  # tamaño de la entrada
                    f'{phase_name}Output': write_keys(self.current_results, f'/{phase_name}_results.json')  # se escriben los resultados de la etapa y se obtiene el tamaño
                }
            )

            if self.execute_phase:
                print(f"{phase_name.upper()} EJECUTADO SATISFACTORIAMENTE")                # se imprime un mensaje de éxito

            return result
        except Exception as e:
            log_error(phase_name, e)
            sys.exit(1)
    return wrapper

class MapReduceJob:

    MAP_INPUT_FILE = '/input.txt'
    REDUCE_KEYS_FILE = '/reduce_keys.json'

    map_results = {}
    combine_results = {}
    reduce_results = {}
    statistics = {}

    current_results = None
    input_size = 0
    invocations = 0
    execute_phase = True

    def write(self, key, value):
        self.current_results.setdefault(key, []).append(value)

    @safe_execute
    def map(self):
        """Ejecuta la etapa map"""

        with open(self.MAP_INPUT_FILE) as input_file:
            input_lines = input_file.readlines()                # se leen las lineas del archivo de entrada

        for line in input_lines:                                # se aplica "fmap" a cada linea del archivo de entrada
            self.fmap(line[:-1])                                # se borra el salto de línea al final de cada linea

        self.input_size = os.path.getsize(self.MAP_INPUT_FILE)  # se obtiene el tamaño del archivo de entrada
        self.invocations = len(input_lines)                     # se obtiene la cantidad de lineas del archivo de entrada

    @safe_execute
    def combine(self):
        """Ejecuta la etapa combine"""

        if self.execute_phase:                                  # si el código combine fue especificado
            for key, values in self.map_results.items():        # se aplica "fcomb" a cada key y sus valores
                self.fcomb(key, values)
            self.invocations = len(self.map_results)            # se obtiene la cantidad de keys de la etapa map
        else:
            self.invocations = 0
            self.current_results = self.map_results

    @safe_execute
    def reduce(self):
        """Ejecuta la etapa reduce"""

        reduce_keys, size = load_json(self.REDUCE_KEYS_FILE)                          # se cargan las claves y valores a reducir

        for key, values in reduce_keys.items():                                       # se aplica "fred" a cada clave y sus valores
            key = eval(key) if key.startswith("(") and key.endswith(")") else key     # se evalua la clave si es una tupla
            self.fred(key, values)

        self.input_size = size                                   # se obtiene el tamaño del archivo de claves a reducir
        self.invocations = len(reduce_keys)                      # se obtiene la cantidad de claves de la etapa reduce

    def execute(self):
        """Ejecuta el Job MapReduce"""

        if os.path.exists(self.REDUCE_KEYS_FILE):
            self.reduce()
        else:
            self.map()
            self.combine()

        save_statistics(self.statistics)
        clean_up()

MapReduceJob().execute()