"""טוען את המאמרים שקיימים (a1..a5) לפי הסדר."""
import importlib, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent / "articles"))
ARTICLES = []
for n in ["a1", "a2", "a3", "a4", "a5"]:
    try:
        m = importlib.import_module(n)
        importlib.reload(m)
        ARTICLES.append(m.A)
    except ModuleNotFoundError:
        pass
