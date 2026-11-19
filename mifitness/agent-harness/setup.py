from setuptools import find_namespace_packages, setup

setup(
    name="cli-anything-mifitness",
    version="1.0.0",
    description="Agent-native CLI for Xiaomi Mi Fitness (Mi Band / Xiaomi Watch) data exports",
    packages=find_namespace_packages(include=["cli_anything.*"]),
    package_data={"cli_anything.mifitness": ["skills/*.md", "tests/*.md"]},
    python_requires=">=3.10",
    install_requires=["click>=8.0", "pyzipper>=0.3.6", "prompt_toolkit>=3.0"],
    extras_require={"dev": ["pytest"]},
    entry_points={"console_scripts": [
        "cli-anything-mifitness=cli_anything.mifitness.mifitness_cli:main"]},
)
