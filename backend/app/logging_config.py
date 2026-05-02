import logging
import sys


def configure_logging(level: int = logging.INFO) -> None:
    """Send INFO/DEBUG to stdout and WARNING+ to stderr.

    Why: Railway (and most log platforms) flag all stderr output as errors.
    Python's logging defaults to stderr, which makes routine INFO logs appear
    red. Splitting by level keeps real warnings/errors visible while letting
    info logs render normally.
    """
    root = logging.getLogger()
    root.setLevel(level)

    for handler in list(root.handlers):
        root.removeHandler(handler)

    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setLevel(level)
    stdout_handler.addFilter(lambda record: record.levelno < logging.WARNING)

    stderr_handler = logging.StreamHandler(sys.stderr)
    stderr_handler.setLevel(logging.WARNING)

    root.addHandler(stdout_handler)
    root.addHandler(stderr_handler)
