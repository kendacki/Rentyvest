package canton

import (
	"os"
	"strings"
)

// PackageIDFromEnv returns the deployed Daml package hash for Seaport DevNet.
func PackageIDFromEnv() string {
	return strings.TrimSpace(os.Getenv("CANTON_DAML_PACKAGE_ID"))
}

// PackageNameFromEnv returns the Daml package name (daml.yaml name) for ACS filters.
// Canton JSON API v2 ACS expects a package name, not a package-id hash.
func PackageNameFromEnv() string {
	name := strings.TrimSpace(os.Getenv("CANTON_DAML_PACKAGE_NAME"))
	if name == "" {
		name = "rentyvest-markets"
	}
	return strings.TrimPrefix(name, "#")
}

// QualifyTemplateID prefixes package-qualified template ids for command submits.
func QualifyTemplateID(packageID, templateID string) string {
	packageID = strings.TrimSpace(packageID)
	templateID = strings.TrimSpace(templateID)

	if packageID == "" || strings.Contains(templateID, packageID+":") {
		return templateID
	}

	if strings.Count(templateID, ":") >= 2 {
		return templateID
	}

	return packageID + ":" + templateID
}

// QualifyTemplateIDForFilter builds a package-name template id for ACS queries.
// Example: #rentyvest-devnet:RentyVest.TestUSDC:USDCIssuer
func QualifyTemplateIDForFilter(templateID string) string {
	templateID = strings.TrimSpace(templateID)
	if templateID == "" {
		return ""
	}

	if strings.HasPrefix(templateID, "#") {
		return templateID
	}

	packageName := PackageNameFromEnv()
	parts := strings.SplitN(templateID, ":", 3)

	// packageIdHash:Module:Entity → #packageName:Module:Entity
	if len(parts) == 3 && len(parts[0]) >= 64 {
		return "#" + packageName + ":" + parts[1] + ":" + parts[2]
	}

	// Module:Entity
	if len(parts) == 2 {
		return "#" + packageName + ":" + templateID
	}

	// name:Module:Entity (already name-qualified, ensure # prefix)
	if len(parts) == 3 && len(parts[0]) < 64 {
		return "#" + templateID
	}

	return "#" + packageName + ":" + templateID
}
